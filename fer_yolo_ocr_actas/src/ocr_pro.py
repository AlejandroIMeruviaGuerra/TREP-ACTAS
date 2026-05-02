import re
from typing import Optional

import cv2
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang="en")


def _asegurar_color(crop):
    if crop is None or crop.size == 0:
        return crop

    img = crop.copy()

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    img = cv2.convertScaleAbs(img, alpha=1.5, beta=10)

    return img


def leer_numero_pro(crop, campo: str = "", max_digits: int = 13) -> Optional[int]:
    try:
        img = _asegurar_color(crop)

        if img is None or img.size == 0:
            return None

        resultado = ocr.ocr(img)

        textos = []

        if resultado:
            for bloque in resultado:
                if not bloque:
                    continue

                for linea in bloque:
                    try:
                        texto = linea[1][0]
                        textos.append(str(texto))
                    except Exception:
                        pass

        texto_total = " ".join(textos)
        digits = re.sub(r"\D", "", texto_total)

        if not digits:
            return None

        if campo == "codigo_mesa":
            digits = digits[:13]

        elif campo in {"hora_apertura", "hora_cierre"}:
            digits = digits[-2:]
            if len(digits) == 2 and int(digits) > 23:
                digits = "0" + digits[1]

        elif campo in {"minuto_apertura", "minuto_cierre"}:
            digits = digits[-2:]
            if len(digits) == 2 and int(digits) > 59:
                digits = "0" + digits[1]

        elif campo == "numero_mesa":
            digits = digits[-3:]

        else:
            digits = digits[-max_digits:]

        return int(digits)

    except Exception as e:
        print(f"[WARN] OCR PRO falló: {e}")
        return None