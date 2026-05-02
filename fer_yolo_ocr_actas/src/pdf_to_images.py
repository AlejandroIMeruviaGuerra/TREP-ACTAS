# pdf_to_images.py
import argparse
from pathlib import Path
import fitz  # PyMuPDF


def pdf_to_images(pdf_path: str, out_dir: str, zoom: float = 2.5):
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    outputs = []
    mat = fitz.Matrix(zoom, zoom)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        out = Path(out_dir) / f"{Path(pdf_path).stem}_page_{i+1}.jpg"
        pix.save(str(out))
        outputs.append(str(out))
    return outputs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--out", default="actas_prueba")
    args = parser.parse_args()
    archivos = pdf_to_images(args.pdf, args.out)
    print("Imágenes generadas:")
    for a in archivos:
        print(a)

if __name__ == "__main__":
    main()
