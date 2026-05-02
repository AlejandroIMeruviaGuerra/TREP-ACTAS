# validar_acta.py
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any

CAMPOS_NUMERICOS = [
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
    "hora_apertura",
    "minuto_apertura",
    "hora_cierre",
    "minuto_cierre",
]

CAMPOS_TEXTO = [
    "departamento",
    "provincia",
    "municipio",
    "localidad",
    "recinto",
]

CAMPOS_BOOLEANOS = [
    "acta_anulada",
    "campo_roto",
    "papeletas_anfora_roto",
]

CAMPOS = CAMPOS_NUMERICOS + CAMPOS_TEXTO + CAMPOS_BOOLEANOS


@dataclass
class ResultadoValidacion:
    estado: str
    errores: List[str]
    advertencias: List[str]
    datos: Dict[str, Optional[Any]]

    def to_dict(self):
        return asdict(self)


def _int_or_none(v):
    if v is None or v == "":
        return None

    try:
        return int(str(v).strip())
    except Exception:
        return None


def _str_or_none(v):
    if v is None:
        return None

    text = str(v).strip()

    if not text:
        return None

    return text


def _bool_or_false(v):
    return bool(v)


def validar_acta(datos: Dict[str, Optional[Any]]) -> ResultadoValidacion:
    datos_norm: Dict[str, Optional[Any]] = {}

    for campo in CAMPOS_NUMERICOS:
        datos_norm[campo] = _int_or_none(datos.get(campo))

    for campo in CAMPOS_TEXTO:
        datos_norm[campo] = _str_or_none(datos.get(campo))

    for campo in CAMPOS_BOOLEANOS:
        datos_norm[campo] = _bool_or_false(datos.get(campo))

    errores: List[str] = []
    advertencias: List[str] = []

    if datos_norm.get("acta_anulada"):
        errores.append("Acta anulada detectada visualmente")

    if datos_norm.get("campo_roto"):
        advertencias.append("Acta con posible daño físico o zona rota")

    if datos_norm.get("papeletas_anfora_roto"):
        advertencias.append("Campo de papeletas en ánfora roto o dañado")

    obligatorios = [
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
        "hora_apertura",
        "minuto_apertura",
        "hora_cierre",
        "minuto_cierre",
        "departamento",
        "provincia",
        "municipio",
        "localidad",
        "recinto",
    ]

    faltantes = [c for c in obligatorios if datos_norm.get(c) is None]

    if faltantes:
        advertencias.append("Campos no leídos por OCR: " + ", ".join(faltantes))

    campos_criticos = [
        "codigo_mesa",
        "numero_mesa",
        "votos_validos",
        "electores_habilitados",
    ]

    criticos_faltantes = [c for c in campos_criticos if datos_norm.get(c) is None]

    if criticos_faltantes:
        advertencias.append("Campos críticos faltantes: " + ", ".join(criticos_faltantes))

    cands = [
        datos_norm.get("candidato_1"),
        datos_norm.get("candidato_2"),
        datos_norm.get("candidato_3"),
        datos_norm.get("candidato_4"),
    ]

    if all(v is not None for v in cands) and datos_norm.get("votos_validos") is not None:
        suma_candidatos = sum(cands)

        if suma_candidatos != datos_norm["votos_validos"]:
            errores.append(
                f"Inconsistencia aritmética: candidatos={suma_candidatos} y votos_validos={datos_norm['votos_validos']}"
            )

    necesarios_total = [
        "votos_validos",
        "votos_blancos",
        "votos_nulos",
        "papeletas_anfora",
    ]

    if all(datos_norm.get(c) is not None for c in necesarios_total):
        total_emitidos = (
            datos_norm["votos_validos"]
            + datos_norm["votos_blancos"]
            + datos_norm["votos_nulos"]
        )

        if total_emitidos != datos_norm["papeletas_anfora"]:
            errores.append(
                f"Inconsistencia aritmética: validos+blancos+nulos={total_emitidos} y anfora={datos_norm['papeletas_anfora']}"
            )

    necesarios_papeletas = [
        "papeletas_anfora",
        "papeletas_no_usadas",
        "electores_habilitados",
    ]

    if all(datos_norm.get(c) is not None for c in necesarios_papeletas):
        total_papeletas = (
            datos_norm["papeletas_anfora"]
            + datos_norm["papeletas_no_usadas"]
        )

        if total_papeletas != datos_norm["electores_habilitados"]:
            errores.append(
                f"Datos contradictorios: anfora+no_usadas={total_papeletas} y habilitados={datos_norm['electores_habilitados']}"
            )

    for campo in CAMPOS_NUMERICOS:
        valor = datos_norm.get(campo)
        if valor is not None and valor < 0:
            errores.append(f"Valor negativo inválido en {campo}: {valor}")

    if datos_norm.get("hora_apertura") is not None:
        if not 0 <= datos_norm["hora_apertura"] <= 23:
            errores.append(f"Hora de apertura inválida: {datos_norm['hora_apertura']}")

    if datos_norm.get("hora_cierre") is not None:
        if not 0 <= datos_norm["hora_cierre"] <= 23:
            errores.append(f"Hora de cierre inválida: {datos_norm['hora_cierre']}")

    if datos_norm.get("minuto_apertura") is not None:
        if not 0 <= datos_norm["minuto_apertura"] <= 59:
            errores.append(f"Minuto de apertura inválido: {datos_norm['minuto_apertura']}")

    if datos_norm.get("minuto_cierre") is not None:
        if not 0 <= datos_norm["minuto_cierre"] <= 59:
            errores.append(f"Minuto de cierre inválido: {datos_norm['minuto_cierre']}")

    if errores:
        estado = "INVALIDA"
    elif advertencias:
        estado = "OBSERVADA"
    else:
        estado = "VALIDA"

    return ResultadoValidacion(
        estado=estado,
        errores=errores,
        advertencias=advertencias,
        datos=datos_norm
    )