# Handoff de implementación y QA · LUM-21–25

Estado: **Hecha**
Veredicto QA: **PASS WITH RISKS**

## Resultado

La home abierta funciona como un álbum móvil: cabecera y presentación compactas, contenido real
visible en el primer viewport, captura como única CTA dominante, subida secundaria y extras en el
menú. Se retiraron el texto introductorio, los iconos redundantes de las miniaturas, el monograma
vacío y el acceso duplicado a la invitación. Cola, errores y recuperación aparecen solo cuando
aportan una acción útil.

Se añadió el evento de navegador `lumen:analytics` con payload tipado y sin fotos, captions ni
identificadores. Cubre home, primera foto, filtros, captura, subida, apertura, recuperación y éxito
de publicación.

## Rutas

- `web/src/app/features/home/home.html`
- `web/src/app/features/home/home.scss`
- `web/src/app/features/home/home-overlays.scss`
- `web/src/app/features/home/home.ts`
- `web/src/app/features/home/home.spec.ts`
- `web/src/app/features/camera/camera.ts`
- `web/src/app/core/services/analytics.service.ts`
- `web/src/app/core/services/analytics.service.spec.ts`

## Evidencias

- `npm test -- --watch=false`: 9 archivos, 66 pruebas, todas pasan.
- `npm run build`: build de producción correcto.
- Matriz local: 320×568, 360×800, 390×844, 430×932 y 844×390.
- En todos los tamaños: overflow horizontal 0, primera foto visible, targets mínimos 44×44 px y
  cero iconos redundantes `.photo-open`.
- A 390×844: primera foto en y=187; cámara 203 px de ancho con fondo primario; subida 155 px y
  transparente.
- Visor móvil: abre y cierra, overflow 0, cerrar 44 px y guardar 48 px; sin errores de consola.

## Riesgos abiertos

- Falta conectar `lumen:analytics` a un proveedor para comparar el embudo con tráfico real.
- La matriz valida navegador responsive, no dispositivos físicos, VoiceOver/TalkBack ni notch real.
- El impacto de priorizar cámara frente a carrete requiere datos posteriores al despliegue.

## Presupuesto

Estimación inicial: 104k tokens / 8–11 jornadas. La entrega se completó dentro del alcance
Balanced, sin migraciones ni cambios en reglas de datos.
