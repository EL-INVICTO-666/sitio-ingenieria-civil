"""
Conexión de Python con Mathcad Prime (requiere Mathcad Prime instalado en Windows).

Dependencias:
    py -m pip install MathcadPy

Uso básico:
    py mathcad_conexion.py                      # solo lista las entradas/salidas de la hoja abierta
    py mathcad_conexion.py ruta\\hoja.mcdx      # lista las entradas/salidas de esa hoja

En la hoja de Mathcad, las variables que quieras controlar desde Python deben estar
designadas como ENTRADAS o SALIDAS con un alias (nombre) de automatización.
"""

import sys
from pathlib import Path

from MathcadPy import Mathcad


def listar_entradas_salidas(hoja):
    """Muestra los alias de entrada y salida designados en la hoja."""
    print("Entradas:", hoja.inputs())
    print("Salidas: ", hoja.outputs())


def calcular(ruta, entradas=None, salidas=None, visible=False):
    """
    Abre una hoja de Mathcad, asigna valores a las entradas, recalcula
    y devuelve un diccionario {alias_salida: valor}.

    entradas: {alias: valor}  -> float/int, str o lista de listas (matriz)
    salidas:  [alias, ...]    -> nombres de las salidas a leer
    """
    entradas = entradas or {}
    salidas = salidas or []
    resultados = {}

    mcad = Mathcad(visible=visible)
    try:
        hoja = mcad.open(Path(ruta))

        for alias, valor in entradas.items():
            if isinstance(valor, str):
                hoja.set_string_input(alias, valor)
            elif isinstance(valor, list):
                hoja.set_matrix_input(alias, valor)
            else:
                hoja.set_real_input(alias, float(valor))

        hoja.calculate()

        for alias in salidas:
            valor, _unidades, codigo_error = hoja.get_real_output(alias)
            resultados[alias] = valor

        return resultados
    finally:
        # Cierra Mathcad sin guardar cambios en el archivo
        mcad.quit(save_option="Discard")


if __name__ == "__main__":
    mcad = Mathcad(visible=True)
    print("Conectado a Mathcad Prime", mcad.get_version())

    if len(sys.argv) > 1:
        hoja = mcad.open(Path(sys.argv[1]))
        listar_entradas_salidas(hoja)
    else:
        print("Hojas abiertas:", mcad.worksheet_names())

    # Para cerrar Mathcad al terminar, descomenta la línea siguiente:
    # mcad.quit(save_option="Discard")
