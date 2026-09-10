# Backlog PO/BA · Controles, mosaico y tono

## Decisión

Usuario: invitado que consulta o añade fotos desde el móvil.
Necesidad: una interfaz cuidada, con una galería menos rígida y textos que informen sin resultar
sentimentales. Resultado: acciones de aporte claras, composición con ritmo y una invitación natural.

## Alcance

### LUM-32 · Rediseñar las acciones de aporte

Convertir la barra inferior en un dock flotante compacto. La cámara mantiene la prioridad, con
`Abrir cámara`; la acción secundaria pasa a `Elegir foto`. Se conservan iconos reconocibles,
targets de al menos 44 px, safe areas y diferenciación que no dependa solo del color.

### LUM-33 · Recuperar un mosaico desigual

Dar tamaños y alineaciones alternos a las tarjetas dentro de las dos columnas. La variación debe ser
estable, no recortar ni deformar imágenes y desaparecer cuando solo exista una foto. La lectura y el
orden del visor no cambian.

### LUM-34 · Reescribir la invitación en tono natural

Sustituir todos los copies editoriales sentimentales por información directa: fecha, álbum
compartido, estado de apertura, ceremonia, celebración e instrucciones de subida. Se mantienen datos
confirmados, enlaces, aviso offline y estructura accesible.

## Criterios de aceptación

- Given 320–430 px, when aparece el dock, then ambas acciones son legibles, accesibles y no tapan la
  última foto.
- Given 4 o más fotos, when se ve la galería, then hay variación visual clara sin crop ni deformación.
- Given una sola foto, then usa el ancho completo sin variación decorativa.
- Given invitación abierta, then no aparecen los copies retirados y cada bloque comunica un dato o
  una instrucción práctica.

## Riesgos

El mosaico puede perder densidad en pantallas estrechas; validar 320 y 390 px. El dock no debe
competir con el contador persistente. El nuevo copy no cambia fechas, lugares ni reglas del evento.

## Handoff

Rutas: `web/src/app/features/home/home.html`, `home.scss`, `home.spec.ts`. Presupuesto Balanced.
QA: tests del área, build y revisión visual móvil de galería, invitación y dock.
