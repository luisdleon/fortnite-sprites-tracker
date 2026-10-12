# Tracker de Espíritus de Fortnite

Sitio estático (HTML/CSS/JS sin build) publicado en GitHub Pages:
https://luisdleon.github.io/fortnite-sprites-tracker/

## Agregar espíritus nuevos

Los datos viven en `data.js` y los iconos en `assets/icons/`. La fuente es
https://fortnite.gg/sprites (atributos `data-season`, `data-rarity`,
`data-variant`, `data-parent-name` de cada `.sprite-card`).

1. **Solo lo que ya salió.** Los que están detrás del interruptor
   "show unreleased" quedan fuera, para que el contador siga siendo
   completable. El total debe coincidir con el de fortnite.gg.
2. **Nunca se regeneran los ids.** El progreso en la nube se guarda por id,
   así que al agregar se emparejan los existentes por nombre de archivo del
   icono y solo se crean ids para los que faltan.
3. **Cada variante va dentro de su familia**, no al final del archivo.
   Después de agregar, ejecutar:

   ```
   python3 tools/ordenar-data.py
   ```

   Reordena `data.js` dejando cada familia junta y sus variantes en el orden
   de `ORDEN_VARIANTES`. Es idempotente y no toca los ids. Si aparece una
   variante nueva, agregarla a esa lista **y** a `VARIANT_LABEL` en `app.js`
   (de ahí sale la etiqueta en las tarjetas, en el filtro de variante y en la
   imagen exportada).
4. **Subir `?v=N`** en los cuatro enlaces de `index.html` cada vez que cambie
   `data.js`, `app.js` o `style.css`. Sin eso los navegadores sirven la
   versión vieja.

### Bajar los iconos

fortnite.gg está detrás de Cloudflare: `curl` siempre da 403 y el panel
interno no deja sacar los archivos. Lo que funciona es, desde el Chrome del
usuario, hacer `fetch` de cada icono en la página, empaquetarlos en un ZIP en
memoria y descargar **ese único archivo** (varias descargas seguidas las
bloquea Chrome). Si Cloudflare empieza a responder 403, hay que esperar: no se
resuelven desafíos de verificación.
