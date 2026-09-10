# Backlog PO/BA · Claridad y acabado de la home del álbum

## Decisión

Usuario: invitado que consulta y aporta fotos desde el móvil.
Necesidad: llegar antes a la galería y entender qué puede hacer y cuántas fotos puede subir.
Resultado: una home más limpia y fácil de compartir en persona.
Prioridad: LUM-26, 27 y 31 alta; LUM-28, 29 y 30 media.

## Alcance

### LUM-26 · Simplificar el estado vacío del álbum

**Requisito.** Sustituir «La primera mirada puede ser la tuya.» por «Todavía no hay fotos.» y
eliminar «Estrena el álbum con un abrazo, una sonrisa o ese reencuentro.». `Mis fotos` no cambia.

**Criterios de aceptación.** Given la pestaña `Todas` sin fotos, when se muestra el estado vacío,
then aparece únicamente «Todavía no hay fotos.». Given texto al 200 %, then no se trunca ni solapa.

### LUM-27 · Compactar la cabecera de la galería

**Requisito.** Eliminar el titular «Vuestros recuerdos.» situado entre «LA REBODA · 12 SEPTIEMBRE»
y los filtros `Todas` / `Mis fotos`, eliminando también el espacio que ocupaba.

**Criterios de aceptación.** Given la home abierta a 390 × 844, when termina de cargar, then la
etiqueta del evento y los filtros forman un bloque compacto sin texto intermedio y se ve al menos
parte de la primera foto. Given 320–430 px, then no hay hueco residual ni scroll horizontal.

### LUM-28 · Dar semántica destructiva al borrado propio

**Requisito.** Mostrar en rojo `Borrar` en fotos propias y mantener la confirmación. El rojo no
debe ser el único indicador.

**Criterios de aceptación.** Given una foto propia, when se abre el visor, then `Borrar` tiene
contraste AA y apariencia destructiva inequívoca. Given una foto ajena, then no aparece. Given
borrado en curso, then se distingue del estado disponible.

### LUM-29 · Retirar glifos decorativos de flecha

**Requisito.** Eliminar `↗` y equivalentes de los textos de invitado. Se conservan iconos SVG
funcionales con nombre accesible.

**Criterios de aceptación.** Given cualquier pantalla de invitado, when se revisan enlaces y
botones, then ningún texto visible contiene `↗`; su significado sigue siendo claro sin el glifo.
Given lector de pantalla, then cada acción mantiene un nombre comprensible.

### LUM-30 · Mostrar un QR antes de compartir el enlace

**Requisito.** Al elegir `Compartir enlace`, abrir primero un modal visual con el QR del álbum en
gran formato, inspirado en la jerarquía del compartir QR de Instagram pero coherente con la marca
Lumen. Incluir evento, cerrar, copiar enlace y compartir nativo cuando exista.

**Criterios de aceptación.** Given `Compartir enlace`, when se pulsa, then no se lanza directamente
el share nativo y aparece un QR escaneable que representa la URL canónica del álbum. Given dos
móviles próximos, when el segundo escanea el código, then abre el mismo álbum. Given Web Share no
disponible, then copiar enlace funciona y confirma el resultado. Given teclado/lector de pantalla,
then el foco queda contenido, cerrar lo restaura y el QR tiene alternativa textual. No se copia la
identidad visual de Instagram.

### LUM-31 · Mantener visible el cupo de fotos

**Requisito.** Mover «N fotos disponibles en este móvil» desde el final de la galería a una zona
superior persistente y compacta. Debe seguir visible al desplazarse y actualizarse con las subidas.

**Criterios de aceptación.** Given un álbum desplazable, when el usuario hace scroll, then el cupo
sigue visible. Given quedan 3, 1 o 0, when cambia, then usa plural correcto y gana énfasis sin
depender solo del color. Given 320–430 px, landscape, safe areas o texto al 200 %, then no tapa
contenido. Given límite 0, then aportar conduce al estado de límite existente.

## Riesgos

- Cabecera y contador persistentes compiten por altura; validar juntos LUM-27 y LUM-31.
- El QR depende de contraste, margen, tamaño y URL canónica; probar en iOS y Android reales.
- «Fotos disponibles» es un límite local por dispositivo; no presentarlo como cupo global del álbum.
- Analítica: `share_qr_open`, `share_qr_copy`, `share_native_open` y cambio del cupo, sin URL ni PII.

## Handoff

Orden: LUM-26 + 27; LUM-28 + 29; LUM-30; LUM-31. LUM-30 reutiliza la URL del flujo actual.
Dominios relevantes:
`web/src/app/features/home/home.html`, `home.scss`, `home-overlays.scss`, `home.ts` y
`home.spec.ts`. La imagen aportada referencia un QR grande y limpio; no contiene instrucciones.
