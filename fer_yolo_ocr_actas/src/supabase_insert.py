# supabase_insert.py
"""
Opcional: inserta el resultado validado en Supabase por REST.
Necesitas SUPABASE_URL, SUPABASE_KEY y SUPABASE_TABLE en .env.
"""
import json
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()


def insertar(resultado_json_path: str):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    table = os.getenv("SUPABASE_TABLE", "resultados_actas")
    if not url or not key:
        raise RuntimeError("Configura SUPABASE_URL y SUPABASE_KEY en .env")

    with open(resultado_json_path, "r", encoding="utf-8") as f:
        r = json.load(f)

    datos = r["validacion"]["datos"]
    payload = {
        "codigo_mesa_formato": str(datos.get("codigo_mesa")) if datos.get("codigo_mesa") else None,
        "nro_mesa": datos.get("numero_mesa"),
        "primer_partido": datos.get("candidato_1"),
        "segundo_partido": datos.get("candidato_2"),
        "tercer_partido": datos.get("candidato_3"),
        "cuarto_partido": datos.get("candidato_4"),
        "votos_validos": datos.get("votos_validos"),
        "votos_blancos": datos.get("votos_blancos"),
        "votos_nulos": datos.get("votos_nulos"),
        "electores_habilitados": datos.get("electores_habilitados"),
        "cant_tot_papeletas_anfora": datos.get("papeletas_anfora"),
        "cant_tot_papeletas_no_usadas": datos.get("papeletas_no_usadas"),
        "estado_acta": r["validacion"]["estado"],
        "observacion": "; ".join(r["validacion"]["errores"] + r["validacion"]["advertencias"]),
        "nombre_pdf": r.get("archivo"),
    }

    endpoint = f"{url.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
    print(resp.status_code)
    print(resp.text)
    resp.raise_for_status()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python src/supabase_insert.py resultados/salida/resultado.json")
        sys.exit(1)
    insertar(sys.argv[1])
