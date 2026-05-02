# infer_acta.py
import argparse
import json
import os
from pathlib import Path
from typing import Dict, Optional, Any, List, Tuple
from save_pdf import guardar_imagen_en_pdf as guardar_imagen_original_pdf
import cv2
from dotenv import load_dotenv
from roboflow import Roboflow

from ocr_utils import cargar_imagen, leer_numero, leer_texto, guardar_debug_crop
from validar_acta import validar_acta

load_dotenv()

ROBOFLOW_WORKSPACE = os.getenv("ROBOFLOW_WORKSPACE", "feryolo")
ROBOFLOW_PROJECT = os.getenv("ROBOFLOW_PROJECT", "actas_ocr_yolo")
ROBOFLOW_VERSION = int(os.getenv("ROBOFLOW_VERSION", "3"))

CLASS_NAMES = {
    "codigo_mesa": "codigo_mesa",
    "numero_mesa": "numero_mesa",
    "candidato_1": "candidato_1",
    "candidato_2": "candidato_2",
    "candidato_3": "candidato_3",
    "candidato_4": "candidato_4",
    "votos_validos": "votos_validos",
    "votos_blancos": "votos_blancos",
    "votos_nulos": "votos_nulos",
    "electores_habilitados": "electores_habilitados",
    "papeletas_anfora": "papeletas_anfora",
    "papeletas_no_usadas": "papeletas_no_usadas",
    "papeletas_anfora_roto": "papeletas_anfora_roto",
    "hora_apertura": "hora_apertura",
    "minuto_apertura": "minuto_apertura",
    "hora_cierre": "hora_cierre",
    "minuto_cierre": "minuto_cierre",
    "departamento": "departamento",
    "provincia": "provincia",
    "municipio": "municipio",
    "localidad": "localidad",
    "recinto": "recinto",
    "acta_anulada": "acta_anulada",
    "campo_roto": "campo_roto",
}

CAMPOS_TEXTO = {
    "departamento",
    "provincia",
    "municipio",
    "localidad",
    "recinto",
}

CAMPOS_ESPECIALES = {
    "acta_anulada",
    "campo_roto",
    "papeletas_anfora_roto",
}


def obtener_padding(cls_name: str) -> int:
    if cls_name == "codigo_mesa":
        return 6

    if cls_name == "numero_mesa":
        return 4

    if cls_name in {
        "candidato_1",
        "candidato_2",
        "candidato_3",
        "candidato_4",
        "votos_validos",
        "votos_blancos",
        "votos_nulos",
        "electores_habilitados",
        "papeletas_anfora",
        "papeletas_no_usadas",
        "hora_apertura",
        "minuto_apertura",
        "hora_cierre",
        "minuto_cierre",
    }:
        return 3

    return 6


def recortar(img, xyxy, padding=4):
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in xyxy]

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)

    return img[y1:y2, x1:x2]


def generar_rotaciones(img) -> List[Tuple[str, Any]]:
    return [
        ("original", img),
        ("rot_90_clockwise", cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)),
        ("rot_180", cv2.rotate(img, cv2.ROTATE_180)),
        ("rot_90_counterclockwise", cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)),
    ]


def puntuar_predicciones(predicciones: List[Dict[str, Any]]) -> float:
    if not predicciones:
        return 0.0

    campos_criticos = {
        "codigo_mesa",
        "numero_mesa",
        "candidato_1",
        "candidato_2",
        "candidato_3",
        "candidato_4",
        "votos_validos",
        "votos_blancos",
        "votos_nulos",
        "electores_habilitados",
        "papeletas_anfora",
        "papeletas_no_usadas",
    }

    clases_detectadas = {p["class"] for p in predicciones}
    cantidad_criticos = len(clases_detectadas.intersection(campos_criticos))
    suma_confianza = sum(float(p["confidence"]) for p in predicciones)

    return cantidad_criticos * 10 + suma_confianza


def predecir_mejor_orientacion(model, img, out_dir: str, conf: float):
    mejor = {
        "nombre": "original",
        "img": img,
        "predicciones": [],
        "score": -1,
    }

    temp_dir = Path(out_dir) / "orientaciones"
    temp_dir.mkdir(parents=True, exist_ok=True)

    for nombre, img_rotada in generar_rotaciones(img):
        temp_path = str(temp_dir / f"{nombre}.jpg")
        cv2.imwrite(temp_path, img_rotada)

        result = model.predict(
            temp_path,
            confidence=conf * 100,
            overlap=25
        ).json()

        predicciones = result.get("predictions", [])
        score = puntuar_predicciones(predicciones)

        if score > mejor["score"]:
            mejor = {
                "nombre": nombre,
                "img": img_rotada,
                "predicciones": predicciones,
                "score": score,
            }

    return mejor


def mejor_deteccion_por_campo(predicciones):
    mejores = {}

    for pred in predicciones:
        cls_name = pred["class"]
        conf = float(pred["confidence"])

        if cls_name not in mejores or conf > float(mejores[cls_name]["confidence"]):
            mejores[cls_name] = pred

    return list(mejores.values())


def procesar_acta_yolo(image_path: str, out_dir: str, conf: float = 0.15) -> Dict[str, Any]:
    img_original = cargar_imagen(image_path)

    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError("Falta ROBOFLOW_API_KEY en el archivo .env")

    rf = Roboflow(api_key=api_key)
    project = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)
    model = project.version(ROBOFLOW_VERSION).model

    Path(out_dir).mkdir(parents=True, exist_ok=True)

    mejor = predecir_mejor_orientacion(
        model=model,
        img=img_original,
        out_dir=out_dir,
        conf=conf
    )

    img = mejor["img"]
    predicciones = mejor_deteccion_por_campo(mejor["predicciones"])

    cv2.imwrite(str(Path(out_dir) / "imagen_orientada.jpg"), img)

    datos: Dict[str, Optional[Any]] = {
        name: None for name in CLASS_NAMES.values()
    }

    detecciones = []
    debug_img = img.copy()

    for pred in predicciones:
        cls_name = pred["class"]
        conf_score = float(pred["confidence"])

        x = float(pred["x"])
        y = float(pred["y"])
        w = float(pred["width"])
        h = float(pred["height"])

        x1 = int(x - w / 2)
        y1 = int(y - h / 2)
        x2 = int(x + w / 2)
        y2 = int(y + h / 2)

        padding = obtener_padding(cls_name)
        crop = recortar(img, [x1, y1, x2, y2], padding=padding)

        if cls_name == "acta_anulada":
            valor = True

        elif cls_name in {"campo_roto", "papeletas_anfora_roto"}:
            valor = True

        elif cls_name in CAMPOS_TEXTO:
            valor = leer_texto(crop)

        else:
            max_digits = 13 if cls_name == "codigo_mesa" else 4
            valor = leer_numero(crop, campo=cls_name, max_digits=max_digits)

        if cls_name in datos:
            datos[cls_name] = valor

        detecciones.append({
            "campo": cls_name,
            "confianza_yolo": round(conf_score, 4),
            "valor_ocr": valor,
            "bbox": [x1, y1, x2, y2],
        })

        guardar_debug_crop(crop, f"{out_dir}/crops", cls_name)

        if cls_name == "acta_anulada":
            color = (0, 0, 255)
        elif valor is not None:
            color = (0, 255, 0)
        else:
            color = (0, 0, 255)

        cv2.rectangle(debug_img, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            debug_img,
            f"{cls_name}:{valor}",
            (x1, max(20, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2
        )

    validacion = validar_acta(datos)

    cv2.imwrite(str(Path(out_dir) / "detecciones.jpg"), debug_img)

    # 🔥 guardar PDF de imagen original
    pdf_original = guardar_imagen_original_pdf(image_path, out_dir)

    salida = {
        "archivo": str(image_path),
        "pdf_original": pdf_original,
        "orientacion_usada": mejor["nombre"],
        "roboflow_version": ROBOFLOW_VERSION,
        "datos_extraidos": datos,
        "detecciones": detecciones,
        "validacion": validacion.to_dict(),
    }

    with open(Path(out_dir) / "resultado.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, indent=2, ensure_ascii=False)

    return salida


def main():
    parser = argparse.ArgumentParser(description="Detecta acta con Roboflow YOLO + OCR")
    parser.add_argument("--image", required=True)
    parser.add_argument("--out", default="resultados/salida")
    parser.add_argument("--conf", type=float, default=float(os.getenv("CONFIDENCE", "0.15")))
    args = parser.parse_args()

    salida = procesar_acta_yolo(
        image_path=args.image,
        out_dir=args.out,
        conf=args.conf
    )

    print(json.dumps(salida["validacion"], indent=2, ensure_ascii=False))
    print(f"\n✔ Orientación usada: {salida['orientacion_usada']}")
    print(f"✔ Roboflow version: {salida['roboflow_version']}")
    print(f"✔ Listo: {args.out}/resultado.json")
    print(f"✔ Imagen orientada: {args.out}/imagen_orientada.jpg")
    print(f"✔ Imagen con detecciones: {args.out}/detecciones.jpg")


if __name__ == "__main__":
    main()