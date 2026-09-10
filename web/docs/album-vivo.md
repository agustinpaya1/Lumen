# Álbum vivo — 8 de septiembre de 2026

La nueva galería toma su dirección visual del flyer de Paula y Javier: oliva, papel claro, líneas punteadas, diez años juntos y la acuarela previamente aprobada. La portada, cámara y galería comparten esa paleta.

## Funciones

- **Pase de recuerdos**: presentación voluntaria, cronológica, sin audio. Pausa, anterior/siguiente y cierre con Escape. Cada foto permanece siete segundos después de cargar; no se avanza mientras la pestaña está oculta. La preferencia de movimiento reducido desactiva la reproducción automática inicial y las animaciones.
- **Ideas fotográficas**: seis sugerencias que cambian únicamente al pulsar. No consumen cuota ni registran actividad.
- **Ficha del sábado**: ceremonia del 12/09/2026 a las 12:00 en la Iglesia de la Asunción de Villarluengo; celebración en el Hostal de la Trucha. Enlaces a búsquedas de Google Maps, sin inventar coordenadas ni horarios adicionales.
- **Compartir álbum**: compartir nativo cuando está disponible, copia al portapapeles como alternativa y enlace seleccionable si ambas opciones fallan. Conserva la clave del evento.

## Implementación

`HomeComponent` conserva una única colección de fotografías y la suscripción Realtime existente. Las tarjetas, los filtros y el pase consumen esos mismos datos. Los INSERT se deduplican por ID y el visor se cierra si su foto es borrada en otro dispositivo. La navegación de «Mis fotos» permanece dentro de ese filtro.

`MemoriesComponent` es un componente independiente cargado mediante `@defer` al solicitarlo. Usa un diálogo modal nativo para mantener el foco dentro de la presentación y devolverlo al botón de entrada al cerrar. Identifica cada foto por su ID para evitar saltos al recibir nuevas filas. Si se elimina la foto activa, selecciona otra válida. El temporizador se limpia al pausar, ocultar la pestaña o destruir el componente.

Los errores de consulta ya no se presentan como un álbum vacío: la galería conserva las fotos cargadas y muestra el fallo de actualización. Los errores de imagen presentan un estado explícito, sin borrar metadatos ni archivos.

No hay nuevas dependencias de ejecución, tablas, permisos ni migraciones de Supabase. El panel de administración también se carga bajo demanda. La cámara sigue incluida en la carga inicial para no añadir un requisito de conexión al abrirla después.

## Verificación

- 50 pruebas automatizadas superadas, incluyendo cola offline, pausa y espera de carga del pase, movimiento reducido, limpieza de temporizadores, cambios Realtime y navegación filtrada.
- Revisión del álbum vacío de la reboda y del álbum histórico con 77 fotos, sin subir ni borrar fotos de prueba.
- Pase verificado con carga de imágenes reales, avance automático, pausa, navegación manual, Escape y recuperación del foco.
- Pantallas de 320 y 390 píxeles de ancho y escritorio de 1280 píxeles; enlaces internos y ficha del evento comprobados.
- Compilación de producción dentro de los presupuestos: 688,59 kB iniciales (175,57 kB estimados en transferencia); pase bajo demanda: 12,36 kB (3,89 kB estimados en transferencia).

## Límites a tener presentes

El pase no descarga preventivamente todo el álbum ni promete funcionar completamente sin cobertura. Su primera apertura necesita descargar el componente y las imágenes necesitan red o caché del navegador. La persistencia offline existente se refiere a las fotografías pendientes de subir.

Las cuatro fotos históricas del evento `demo` no cargaron sus archivos durante la verificación, coherente con la auditoría previa de filas sin objeto. No se han eliminado ni reparado esos datos como parte de este cambio.

Los datos y textos de la reboda siguen personalizados en el frontend. Convertirlos en configuración por evento continúa siendo trabajo separado para una versión comercial.
