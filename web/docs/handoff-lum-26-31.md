# Handoff de implementación y QA · LUM-26–31

Estado: **Hechas**
Veredicto QA: **PASS WITH RISKS**

## Resultado

- Estado vacío reducido a «Todavía no hay fotos.» y cabecera de galería compactada.
- Cupo local visible en controles superiores persistentes, con singular y estados bajo/sin cupo.
- Borrado propio con tratamiento rojo destructivo y confirmación sin emoticonos.
- Eliminados los glifos `↗` de la experiencia de invitado.
- `Compartir enlace` abre primero un modal accesible con QR, copia y compartir nativo opcional.
- Añadidos eventos `share_qr_open`, `share_qr_copy` y `share_native_open` sin URL ni PII.

## Evidencias

- `npm test -- --watch=false`: 9 archivos, 68 pruebas, todas pasan.
- `npm run build`: correcto; bundle inicial 699,18 kB, dentro del límite de 700 kB.
- QA en navegador local: QR renderizado y visible; copia confirmada; Escape cierra; foco vuelve a
  `Más opciones del evento`; consola sin errores; viewport 390 px sin overflow horizontal.
- Búsqueda estática: no quedan `↗` ni los tres copies retirados en la home.

## Rutas

- `web/src/app/features/home/home.html`
- `web/src/app/features/home/home.scss`
- `web/src/app/features/home/home-overlays.scss`
- `web/src/app/features/home/home.ts`
- `web/src/app/features/home/home.spec.ts`
- `web/src/app/core/services/analytics.service.ts`
- `web/package.json` y `web/package-lock.json`

## Riesgos abiertos

- Falta una prueba de escaneo cruzado con cámaras físicas iOS/Android.
- El bundle queda 0,82 kB por debajo del presupuesto; futuras dependencias deberán vigilarlo.
- `npm audit` informa de vulnerabilidades preexistentes en el árbol; no se aplicó un arreglo
  automático porque queda fuera de estas tareas y podría introducir cambios incompatibles.
