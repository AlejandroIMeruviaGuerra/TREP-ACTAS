# api.py
import os
import sys
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Permite importar archivos que están dentro de src
SRC_DIR = Path(__file__).resolve().parent
sys.path.append(str(SRC_DIR))

from infer_acta import procesar_acta_yolo

load_dotenv()

app = FastAPI(title="RRV OCR Actas - Fer/José")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("resultados/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def home():
    return {
        "status": "ok",
        "mensaje": "API OCR Actas funcionando con Roboflow + OCR"
    }


@app.post("/procesar-acta")
async def procesar_acta(file: UploadFile = File(...)):
    if not os.getenv("ROBOFLOW_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="Falta ROBOFLOW_API_KEY en el archivo .env"
        )

    out_file = UPLOAD_DIR / file.filename

    with open(out_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    out_dir = Path("resultados") / Path(file.filename).stem

    resultado = procesar_acta_yolo(
        image_path=str(out_file),
        out_dir=str(out_dir),
        conf=float(os.getenv("CONFIDENCE", "0.10"))
    )

    return {
        "ok": True,
        "mensaje": "Acta procesada correctamente",
        "resultado": resultado
    }