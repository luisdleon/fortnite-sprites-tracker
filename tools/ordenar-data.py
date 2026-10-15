#!/usr/bin/env python3
"""Reordena data.js para que cada espiritu quede junto a su familia.

Reglas:
  - Las temporadas conservan el orden en que aparecen hoy.
  - Dentro de una temporada, las familias conservan el orden de su primera
    aparicion (asi las familias nuevas se agregan al final, como en
    fortnite.gg).
  - Dentro de una familia, las variantes siguen ORDEN_VARIANTES[temporada],
    que copia el orden en que fortnite.gg las lista, de modo que una variante
    nueva cae en su lugar y no al final del archivo.

Los ids no se tocan: solo cambia el orden del arreglo, nunca su contenido.
Ejecutar despues de agregar espiritus nuevos:  python3 tools/ordenar-data.py
"""
import json
import os
import sys

# Orden de variantes dentro de cada familia, copiado del que usa
# fortnite.gg. Es distinto por temporada: "quack" va cuarto en C7 S3 y al
# final en C7 S4, porque ahi salio despues. Al aparecer una variante nueva
# se agrega aqui y tambien a VARIANT_LABEL en app.js.
ORDEN_VARIANTES = {
    "C7S3": ["base", "cube", "gold", "quack", "candy", "galaxy", "gem",
             "holofoil"],
    "C7S4": ["base", "gold", "cheatmaster", "hacker", "reaper", "tricktreat",
             "quack"],
}

RUTA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data.js")


def main():
    src = open(RUTA, encoding="utf-8").read()
    i, j = src.index("["), src.rindex("]") + 1
    arr = json.loads(src[i:j])
    pre, post = src[:i], src[j:]

    temporadas = list(dict.fromkeys(s["season"] for s in arr))

    sin_orden = [t for t in temporadas if t not in ORDEN_VARIANTES]
    if sin_orden:
        sys.exit(f"Temporadas sin orden definido en ORDEN_VARIANTES: {sin_orden}")

    for temporada in temporadas:
        faltan = sorted({s["variant"] for s in arr if s["season"] == temporada}
                        - set(ORDEN_VARIANTES[temporada]))
        if faltan:
            sys.exit(f"Variantes sin lugar en ORDEN_VARIANTES[{temporada!r}]: {faltan}")

    salida = []
    for temporada in temporadas:
        de_temporada = [s for s in arr if s["season"] == temporada]
        pos = {v: n for n, v in enumerate(ORDEN_VARIANTES[temporada])}
        for familia in dict.fromkeys(s["parent"] for s in de_temporada):
            salida.extend(sorted(
                (s for s in de_temporada if s["parent"] == familia),
                key=lambda s: pos[s["variant"]],
            ))

    assert len(salida) == len(arr)
    assert {s["id"] for s in salida} == {s["id"] for s in arr}

    if salida == arr:
        print("Ya estaba ordenado.")
        return

    cuerpo = ",\n".join("  " + json.dumps(s, ensure_ascii=False) for s in salida)
    open(RUTA, "w", encoding="utf-8").write(pre + "[\n" + cuerpo + "\n]" + post)
    print(f"Reordenados {len(salida)} espiritus.")


if __name__ == "__main__":
    main()
