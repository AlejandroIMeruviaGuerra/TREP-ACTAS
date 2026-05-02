# FER - RRV OCR Actas electorales

Proyecto para probar captura de actas con celular, detección por YOLO, lectura OCR y validación de inconsistencias.

Lee primero: `docs/INSTRUCCIONES.md`.

Comandos principales:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python src/train_yolo.py
python src/infer_acta.py --image actas_prueba/foto_celular.jpg --model models/best.pt --out resultados/foto_celular
```
