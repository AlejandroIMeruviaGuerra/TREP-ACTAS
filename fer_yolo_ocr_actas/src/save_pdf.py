#save_pdf.py
from PIL import Image
from pathlib import Path

def guardar_imagen_en_pdf(ruta_imagen: str, out_dir: str):
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    nombre = Path(ruta_imagen).stem
    ruta_pdf = Path(out_dir) / f"{nombre}.pdf"

    imagen = Image.open(ruta_imagen)

    # convertir a RGB (importante para PDF)
    if imagen.mode != "RGB":
        imagen = imagen.convert("RGB")

    imagen.save(ruta_pdf)

    return str(ruta_pdf)