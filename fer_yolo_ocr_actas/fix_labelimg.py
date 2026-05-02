from pathlib import Path

base = Path(".venv/Lib/site-packages")

archivos = [
    base / "labelImg" / "labelImg.py",
    base / "libs" / "canvas.py"
]

for p in archivos:
    if not p.exists():
        print(f"No encontrado: {p}")
        continue

    txt = p.read_text(encoding="utf-8")

    reemplazos = {
        "bar.setValue(bar.value() + bar.singleStep() * units)":
        "bar.setValue(int(bar.value() + bar.singleStep() * units))",

        "self.zoom_widget.setValue(value)":
        "self.zoom_widget.setValue(int(value))",

        "h_bar.setValue(new_h_bar_value)":
        "h_bar.setValue(int(new_h_bar_value))",

        "v_bar.setValue(new_v_bar_value)":
        "v_bar.setValue(int(new_v_bar_value))",

        "p.drawLine(self.prev_point.x(), 0, self.prev_point.x(), self.pixmap.height())":
        "p.drawLine(int(self.prev_point.x()), 0, int(self.prev_point.x()), int(self.pixmap.height()))",

        "p.drawLine(0, self.prev_point.y(), self.pixmap.width(), self.prev_point.y())":
        "p.drawLine(0, int(self.prev_point.y()), int(self.pixmap.width()), int(self.prev_point.y()))",
    }

    for old, new in reemplazos.items():
        txt = txt.replace(old, new)

    p.write_text(txt, encoding="utf-8")
    print(f"Corregido: {p}")

print("Parche terminado")