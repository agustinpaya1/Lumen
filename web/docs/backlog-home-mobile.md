# Handoff PO/BA · Home móvil minimalista

## Decisión

La home abierta debe comportarse como un álbum móvil, no como una landing: en el primer
viewport el usuario debe entender qué está viendo, ver contenido real y disponer de una única
acción primaria. Se conserva la personalidad editorial de Lumen, pero se elimina o relega todo
elemento que no ayude a explorar, capturar, subir o recuperar una foto.

Usuario: invitado que abre el álbum desde un móvil, frecuentemente con prisa o cobertura débil.
Necesidad: comprender la pantalla y actuar sin aprender la interfaz.
Resultado medible: contenido visible en el primer viewport, CTA principal inequívoco y flujo
completo operable a 320–430 px sin solapes ni scroll horizontal.

## Evidencia de partida

- Revisión local de `/home` a 390 × 844 px el 10-09-2026.
- Antes de la galería compiten: marca, nombre del evento, menú, eyebrow, H1, texto introductorio,
  dos filtros, enlace a invitación, contador y dos CTA fijos.
- Los CTA `Hacer foto` y `Subir foto` tienen el mismo peso, aunque capturar es la intención central.
- Los iconos `↗` sobre cada miniatura repiten una affordance ya cubierta por tocar la tarjeta.
- Existe buena base móvil: objetivos táctiles de 44 px, dock con safe area, grid de dos columnas,
  navegación por swipe y estados offline/cola ya modelados.

## Alcance

Incluido: home con álbum abierto, cabecera, jerarquía inicial, filtros, tarjetas, dock, visor y
estados loading/vacío/error/offline/cola/límite. Breakpoints de 320, 360, 390 y 430 px; portrait y
landscape; safe areas; tamaño de texto al 200 %.

Excluido: rediseño de invitación, cámara, admin, modelo de datos, reglas de límite y marca visual.

Reglas:

1. Cada elemento visible debe apoyar una de cuatro intenciones: orientarse, explorar, aportar o
   recuperarse de un problema.
2. `Hacer foto` es la acción primaria; `Subir del móvil` es secundaria, sin ocultarse.
3. Información ocasional (invitación, compartir, pase de recuerdos) vive en el menú progresivo.
4. Estados operativos solo aparecen cuando son accionables; no reservan espacio en estado normal.
5. No se reduce accesibilidad para ganar densidad: targets ≥44 px, contraste AA y foco visible.

## Criterios de aceptación globales

- Given 390 × 844 y álbum con fotos, when carga la home, then se ve al menos parte de una foto
  sin desplazar y existe una sola CTA de mayor peso visual.
- Given cualquier ancho entre 320 y 430 px, when se recorre la home, then no hay scroll horizontal,
  texto truncado, controles solapados ni contenido oculto por el dock/safe area.
- Given teclado o lector de pantalla, when se recorren controles, then el orden y nombres describen
  su propósito sin depender de iconos.
- Given texto al 200 %, when se usa la home, then todas las acciones siguen disponibles.

## Analítica mínima

Medir `home_view`, `gallery_first_photo_visible`, `capture_tap`, `upload_tap`, `filter_change`,
`photo_open`, `recovery_action` y `upload_success`; propiedades mínimas: ancho de viewport, estado de
red, origen de subida y presencia de fotos. No registrar imágenes, dedicatorias ni identificadores
personales.

## Riesgos

- Reducir demasiado el contexto emocional puede volver la experiencia genérica.
- Cambiar la prioridad de CTA puede reducir subidas desde carrete; comparar antes/después.
- La galería depende de proporciones impredecibles y datos en tiempo real; probar con 0, 1, 2 y 50+
  fotos, captions largos e imágenes fallidas.

## Handoff

Tarea: iniciativa Home móvil minimalista
Resultado: álbum móvil con jerarquía inequívoca, contenido inmediato y estados resilientes.
Decisiones ya tomadas: captura primaria; upload secundario; extras bajo divulgación progresiva.
Rutas relevantes: `web/src/app/features/home/home.html`, `home.scss`, `home-overlays.scss`,
`home.ts`, `home.spec.ts`.
Criterios de aceptación: los globales anteriores y los registrados en cada ítem del backlog.
Evidencias: inspección DOM y viewport local 390 × 844; revisión estática de las rutas indicadas.
Riesgos abiertos: impacto de CTA en comportamiento real y equilibrio entre emoción/densidad.
Presupuesto restante: estimación total 104k tokens; ejecutar por prioridad, no como un lote único.
