# Handoff LUM-35–38 · Pulido de experiencia móvil

## Estado

**PASS WITH RISKS.** Los cuatro cambios están implementados y listos para producción. El único
riesgo abierto es la validación del pulso de linterna en hardware real, porque la API `torch`
depende del navegador y del dispositivo.

## Cambios entregados

- Los enlaces de iglesia y hostal ahora son botones-enlace de 45 px, con contraste, borde, foco y
  chevron visual.
- Aceptar el consentimiento cierra el modal y deja visible el opening. Solo `Entrar a la galería`
  completa el tutorial y navega. Las visitas que ya terminaron ambos pasos siguen entrando directo.
- La galería mantiene dos columnas del mismo ancho y alterna únicamente la altura de las
  miniaturas. Una única foto queda centrada, contenida y limitada a 360 px.
- Activar flash selecciona el modo sin mantener la linterna encendida. Al disparar se intenta un
  pulso de 140 ms y se apaga tras capturar; el parpadeo visual de 150 ms cubre equipos sin `torch`.

## Evidencia QA

- `npm test -- --watch=false`: 10 archivos y 71 pruebas superadas.
- `npm run build`: correcto; bundle inicial 699,94 kB, sin advertencia de presupuesto.
- Vista móvil 390 × 844: enlaces de ubicación de 45 px, contraste visual y sin overflow.
- Vista móvil 320 × 568: tarjetas de 146 px de ancho con alturas 183, 110, 110 y 146 px; sin
  overflow horizontal.
- Onboarding: pruebas automatizadas para aceptación sin navegación, entrada explícita y retorno de
  visitante que ya completó el flujo.

## Riesgo residual

No se solicitó permiso de cámara durante QA visual. Validar en un móvil compatible que el pulso
físico se enciende y apaga alrededor del disparo. Si el navegador no expone `torch`, el parpadeo
visual mantiene una respuesta consistente.
