# train_yolo.py
from ultralytics import YOLO

# Entrena YOLO para detectar las zonas del acta.
# Requiere dataset etiquetado en formato YOLO dentro de dataset/images y dataset/labels.

def main():
    model = YOLO("yolov8n.pt")  # liviano para laptop. Cambia a yolov8s.pt si tienes GPU.
    model.train(
        data="dataset.yaml",
        epochs=80,
        imgsz=960,
        batch=4,
        patience=20,
        project="runs",
        name="actas_yolo",
        workers=0,
        device="cpu"  # cambia a 0 si tienes GPU NVIDIA configurada
    )
    print("Entrenamiento terminado. Copia runs/actas_yolo/weights/best.pt a models/best.pt")

if __name__ == "__main__":
    main()
