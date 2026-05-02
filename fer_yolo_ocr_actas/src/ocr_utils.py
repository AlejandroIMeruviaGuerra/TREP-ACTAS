# ocr_utils.py
import os
import re
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pytesseract
from dotenv import load_dotenv

load_dotenv()

TESSERACT_CMD = os.getenv(
    "TESSERACT_CMD",
    r"C:/Program Files/Tesseract-OCR/tesseract.exe"
)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def cargar_imagen(path: str):
    img = cv2.imread(str(path))
    if img is None:
        raise FileNotFoundError(f"No se pudo leer la imagen: {path}")
    return img


def _preprocesos(crop):
    if crop is None or crop.size == 0:
        return []

    img = crop.copy()

    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img

    gray = cv2.resize(gray, None, fx=5, fy=5, interpolation=cv2.INTER_CUBIC)
    gray = cv2.convertScaleAbs(gray, alpha=2.1, beta=20)

    blur = cv2.GaussianBlur(gray, (3, 3), 0)

    _, otsu = cv2.threshold(
        blur,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    adaptive = cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9
    )

    inverted = cv2.bitwise_not(otsu)

    return [gray, otsu, adaptive, inverted]


def leer_texto(crop) -> Optional[str]:
    imagenes = _preprocesos(crop)
    if not imagenes:
        return None

    candidatos = []

    for img in imagenes:
        for psm in [6, 7, 8]:
            config = f"--oem 3 --psm {psm}"
            text = pytesseract.image_to_string(img, lang="eng", config=config)
            text = re.sub(r"\s+", " ", text).strip()

            if text:
                candidatos.append(text)

    if not candidatos:
        return None

    return max(candidatos, key=len)


def leer_numero(crop, campo: str = "", max_digits: int = 13) -> Optional[int]:
    imagenes = _preprocesos(crop)
    if not imagenes:
        return None

    candidatos = []

    for img in imagenes:
        for psm in [7, 8, 13]:
            config = f"--oem 3 --psm {psm} -c tessedit_char_whitelist=0123456789"
            text = pytesseract.image_to_string(img, lang="eng", config=config)

            digits = re.sub(r"\D", "", text)

            if digits:
                candidatos.append(digits)

    if not candidatos:
        return None

    elegido = max(candidatos, key=len)

    # 🔥 CORRECCIONES INTELIGENTES

    # corregir horas tipo 88 → 08
    if campo in {"hora_apertura", "hora_cierre"}:
        digits = elegido[-2:]

        if len(digits) == 2:
            if int(digits) > 23:
                digits = "0" + digits[1]  # 88 → 08

    elif campo in {"minuto_apertura", "minuto_cierre"}:
        digits = elegido[-2:]

        if len(digits) == 2:
            if int(digits) > 59:
                digits = "0" + digits[1]

    elif campo == "numero_mesa":
        digits = elegido[-3:]

    elif campo == "codigo_mesa":
        digits = elegido[:13]

    else:
        digits = elegido[-max_digits:]

    try:
        return int(digits)
    except:
        return None


def guardar_debug_crop(crop, out_dir: str, nombre: str):
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    safe_name = nombre.replace("/", "_").replace("\\", "_")
    cv2.imwrite(str(Path(out_dir) / f"{safe_name}.png"), crop)