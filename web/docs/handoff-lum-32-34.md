# Handoff de implementación y QA · LUM-32–34

Estado: **Hechas**
Veredicto QA: **PASS**

## Resultado

- Dock flotante con acciones `Abrir cámara` y `Elegir foto`, jerarquía clara y targets de 48 px.
- Mosaico de dos columnas con anchuras y desplazamientos alternos, sin recortar imágenes.
- Invitación reescrita con fecha, lugares, estado e instrucciones directas; retirado el copy
  sentimental y la fecha duplicada.

## Evidencias

- `npm test -- --watch=false`: 9 archivos, 68 pruebas correctas.
- `npm run build`: correcto y dentro del presupuesto.
- QA visual a 390 × 844 y 320 × 568: dock legible, mosaico desigual, contador completo y sin
  overflow horizontal ni errores de consola.
- Invitación revisada completa a 390 px; mantiene datos, enlaces y orden accesible.

## Rutas

- `web/src/app/features/home/home.html`
- `web/src/app/features/home/home.scss`
- `web/docs/backlog-home-tone-and-gallery.md`

## Riesgos abiertos

La composición conserva las proporciones naturales; su ritmo exacto dependerá de la mezcla real de
fotos verticales y horizontales. Conviene observarla con un álbum de 20 o más fotos reales.
