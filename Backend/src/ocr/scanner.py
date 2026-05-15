import cv2
import pytesseract
from pytesseract import Output
import re
import json
import sys
import os
import numpy as np
from pdf2image import convert_from_path

# Configuración de Tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def procesar_recorte_numerico(imagen_recortada):
    """Limpia y lee solo el cuadradito del número"""
    # Escala de grises y aumento de tamaño
    gris = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)
    grande = cv2.resize(gris, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    
    # Umbral para dejar el número negro puro sobre fondo blanco
    _, limpia = cv2.threshold(grande, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Leer con PSM 7 (Tratar la imagen como una sola línea de texto)
    texto = pytesseract.image_to_string(limpia, config='--psm 7 digits')
    
    # Limpiar basura y quedarse con los dígitos
    digitos = re.sub(r'\D', '', texto)
    return int(digitos[-3:]) if digitos else 0

def extraer_datos_sniper(img):
    datos = {
        "codigo_acta": None,
        "P1": 0, "P2": 0, "P3": 0, "P4": 0,
        "votos_validos": 0, "votos_blancos": 0, "votos_nulos": 0
    }

    # 1. Obtener todos los datos de posición del texto
    d = pytesseract.image_to_data(img, output_type=Output.DICT, lang='spa')
    n_boxes = len(d['text'])
    
    alto_img, ancho_img, _ = img.shape

    # 2. Buscar palabras clave y recortar a su derecha
    for i in range(n_boxes):
        texto = d['text'][i].upper()
        if not texto.strip(): continue

        # Coordenadas de la palabra encontrada
        (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])

        # Lógica para encontrar los votos (Buscamos el nombre y recortamos a la derecha)
        keywords = {
            "DAENERYS": "P1", "SANSA": "P2", "ROBERT": "P3", "TYRION": "P4",
            "VÁLIDOS": "votos_validos", "VALIDOS": "votos_validos",
            "BLANCOS": "votos_blancos", "NULOS": "votos_nulos"
        }

        for key, field in keywords.items():
            if key in texto:
                # Definimos el área a la derecha (donde están los casilleros de votos)
                # Tomamos un ancho de unos 300 píxeles a la derecha de la palabra
                x_inicio = x + w + 10
                x_fin = min(x_inicio + 400, ancho_img)
                y_inicio = y - 10
                y_fin = y + h + 10
                
                recorte = img[y_inicio:y_fin, x_inicio:x_fin]
                if recorte.size > 0:
                    datos[field] = procesar_recorte_numerico(recorte)

        # 3. Buscar el Código de Acta (13 dígitos)
        match_cod = re.search(r'\b(\d{13})\b', d['text'][i])
        if match_cod and not datos["codigo_acta"]:
            datos["codigo_acta"] = match_cod.group(1)

    return datos

def procesar_archivo(ruta_archivo):
    try:
        if ruta_archivo.lower().endswith('.pdf'):
            imagenes = convert_from_path(ruta_archivo, dpi=300, poppler_path=r'C:\poppler\Library\bin')
            img = np.array(imagenes[0])
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        else:
            img = cv2.imread(ruta_archivo)

        # Extraer datos con el nuevo motor
        datos_finales = extraer_datos_sniper(img)
        
        print(json.dumps(datos_finales))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        procesar_archivo(sys.argv[1])