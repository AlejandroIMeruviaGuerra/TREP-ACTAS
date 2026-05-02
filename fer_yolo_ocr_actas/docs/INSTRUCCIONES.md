# Proyecto Fer/José - OCR de Actas con YOLO + OpenCV + OCR

Este proyecto sirve para la parte de **fotografías/PDFs de actas electorales** del sistema RRV.

## Qué hace

1. Recibe una foto del acta tomada con celular.
2. YOLO detecta las zonas importantes del acta.
3. OpenCV mejora cada recorte.
4. Tesseract OCR lee los números.
5. Python valida inconsistencias:
   - suma de candidatos = votos válidos
   - votos válidos + blancos + nulos = papeletas en ánfora
   - papeletas en ánfora + no usadas = electores habilitados
6. Clasifica el acta:
   - VALIDA
   - OBSERVADA
   - INVALIDA

## Instalación en Visual Studio Code

### 1. Abrir carpeta
Abre esta carpeta en VS Code.

### 2. Crear entorno virtual

```bash
python -m venv .venv
```

Activar en Windows CMD:

```bash
.venv\Scripts\activate
```

Activar en PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Instalar Tesseract OCR

Descarga e instala Tesseract para Windows.

Ruta común:

```txt
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Copia `.env.example` como `.env` y revisa esta línea:

```txt
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

## Cómo entrenar YOLO

### Paso 1: preparar imágenes
Coloca imágenes en:

```txt
dataset/images/train
```

y algunas en:

```txt
dataset/images/val
```

### Paso 2: etiquetar imágenes
Usa Roboflow, LabelImg o CVAT.

Debes marcar estas clases:

```txt
codigo_mesa
numero_mesa
candidato_1
candidato_2
candidato_3
candidato_4
votos_validos
votos_blancos
votos_nulos
electores_habilitados
papeletas_anfora
papeletas_no_usadas
```

Cada imagen debe tener su `.txt` en formato YOLO dentro de:

```txt
dataset/labels/train
dataset/labels/val
```

Ejemplo:

```txt
dataset/images/train/acta_1.jpg
dataset/labels/train/acta_1.txt
```

### Paso 3: entrenar

```bash
python src/train_yolo.py
```

Cuando termine, copia:

```txt
runs/actas_yolo/weights/best.pt
```

a:

```txt
models/best.pt
```

## Cómo procesar una foto

Coloca tu foto en `actas_prueba`, por ejemplo:

```txt
actas_prueba/foto_celular.jpg
```

Ejecuta:

```bash
python src/infer_acta.py --image actas_prueba/foto_celular.jpg --model models/best.pt --out resultados/foto_celular
```

El resultado estará en:

```txt
resultados/foto_celular/resultado.json
resultados/foto_celular/detecciones.jpg
resultados/foto_celular/crops/
```

## Cómo convertir PDF a imagen

```bash
python src/pdf_to_images.py --pdf acta.pdf --out actas_prueba
```

## Cómo levantar API local

```bash
uvicorn src.api:app --reload
```

Abrir:

```txt
http://127.0.0.1:8000/docs
```

Subes una foto en el endpoint:

```txt
POST /procesar-acta
```

## Evidencias para tu informe

Saca capturas de:

1. Foto original tomada con celular.
2. Detecciones YOLO (`detecciones.jpg`).
3. Recortes detectados (`crops`).
4. Resultado JSON con estado VALIDA/OBSERVADA/INVALIDA.
5. Inserción en base de datos si ya está conectado.

## Texto para defender

> Se implementó un flujo de procesamiento de imágenes para el sistema RRV, donde una fotografía del acta tomada desde celular es procesada mediante YOLO para ubicar los campos relevantes, OpenCV para mejorar la calidad de los recortes y OCR para extraer los valores numéricos. Luego se aplican validaciones aritméticas para detectar inconsistencias y clasificar el acta como válida, observada o inválida.
