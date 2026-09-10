# Lumen móvil y apertura manual — 8 septiembre 2026

## Experiencia

- Álbum abierto: cabecera compacta, fotos al principio, dos columnas independientes con proporciones originales, sin recortes artificiales. Con una sola foto, ocupa todo el ancho disponible.
- Cámara y selección desde el dispositivo permanecen a mano en la barra inferior. La vista previa conserva el encuadre original; el botón de publicación se llama **Compartir**.
- Invitación: acuarela, fecha y lugares del flyer, explicación de uso y aviso de espera. No se abre por la fecha: el anfitrión decide.
- Menú de tres puntos: invitación, compartir enlace, pase y modo TV. El modo TV elimina el marco, conserva la foto completa y permite ocultar controles. Pantalla completa nativa es opcional; si el navegador no la admite, se explica y sigue funcionando dentro de la ventana.

## Flujo técnico

1. `EventService` consulta `get_event_state(event_key)`, guarda la última respuesta por evento y escucha los cambios de `events`.
2. Realtime es el canal principal; se vuelve a consultar al recuperar conexión, volver a la pestaña y cada 30 segundos mientras esté visible.
3. `uploads_open=false` muestra la invitación. `true` carga el álbum sin recargar la página. El componente cierra cualquier visor al pausar.
4. El botón del administrador llama a `set_event_uploads_open`. La función comprueba la cuenta en el servidor antes de actualizar.
5. Las políticas restrictivas impiden INSERT de fotos y objetos de Storage si el evento está cerrado. También ocultan los registros de fotos a invitados durante la espera, incluso si intentan llamar directamente a la API.
6. La cola IndexedDB no descarta pendientes al pausar. Cuando el evento vuelve a abrirse, reanuda la subida. Si el móvil sigue sin cobertura, puede capturar usando la última autorización abierta que observó; el servidor siempre decide si publica. La caché local no otorga permisos.

## Administrador

Ruta: `/admin?e=jp-reboda-2026-k7m4q9x2`.

El PIN antiguo dejó de conceder acceso. Se utiliza correo y contraseña con confirmación del email. La sesión administrativa tiene su propia clave de almacenamiento; no reemplaza la identidad anónima que posee las fotos y los pendientes del invitado.

**Pendiente de configuración:** el propietario debe indicar su correo de administrador. No se ha autorizado ningún correo supuesto. Los eventos existentes continúan abiertos; no se ha pasado la reboda al modo invitación mientras falta el acceso real.

Provisionar mediante SQL Editor/connector de confianza, sustituyendo el marcador por el correo explícitamente indicado por el propietario:

```sql
insert into public.event_admins(event_key,email)
values ('jp-reboda-2026-k7m4q9x2',lower(trim('CORREO_DEL_ADMINISTRADOR')))
on conflict do nothing;
```

Después, el propietario crea su cuenta desde el panel, confirma el correo e inicia sesión. Nunca compartir la contraseña en el chat. Crear una cuenta sin estar en esta lista no da permisos. Si ya tiene cuenta, no necesita registrarse otra vez.

En Supabase Auth, permitir el retorno a `https://lumen-umber.vercel.app/admin` (incluido su parámetro de evento según la allowlist de redirecciones). La confirmación también permite volver manualmente al enlace del panel si el retorno configurado lleva a otra página.

Comprobar la sesión de administrador y el botón de apertura antes de activar **Volver al modo invitación**. Pausar no borra las fotos.

## Seguridad y alcance

La migración 019 fue aplicada mediante Supabase el 8 de septiembre de 2026. Los eventos anteriores mantienen `uploads_open=true` por compatibilidad.

- `event_admins` no admite lecturas ni escrituras directas de invitados; RLS sin políticas es intencionado. Las funciones elevadas usan un `search_path` vacío y comprueban identidad/alcance donde corresponda.
- `get_event_state` es público por diseño: sólo devuelve información de invitación y estado del evento cuya clave se proporciona. No enumera eventos ni devuelve correos, miembros o fotos.
- Los avisos del asesor sobre funciones SECURITY DEFINER y usuarios anónimos corresponden a estos accesos deliberados; no significan que el invitado sea administrador.
- **No convierte Storage en privado:** las URLs públicas conocidas de fotos existentes siguen siendo accesibles. La pausa es un control de participación y presentación, no una garantía de privacidad retroactiva.
- Supabase señala que la protección frente a contraseñas filtradas está desactivada. Revisar su disponibilidad/configuración antes de un uso comercial: [guía oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Sin cobertura no hay entrega de cambios Realtime ni subida en segundo plano con la app cerrada. Reabrir Lumen con conexión sigue siendo necesario.

## Verificación

- Ejecutar `npm test -- --watch=false` en `web`. El comando directo `vitest run` no realiza la compilación Angular de las plantillas y no es equivalente.
- Ejecutar `npm run build` en `web`.
- `web/scripts/audit/019_launch_policy_test.sql`: fixtures en una transacción que termina en ROLLBACK. Comprueba invitado sin permisos de apertura, bloqueo de escritura directa, lectura/inserciones cerradas, apertura por administrador verificado y lectura/subida después de abrir. No elimina fotos reales.
- Pruebas automatizadas: caché por evento, continuidad offline, pausa y reapertura de pendientes, actualización de galería, carriles del mosaico, reproducción y pantalla completa con fallback.
- Revisión visual en navegador a anchuras móviles; no sustituye la comprobación de permisos, enfoque y fullscreen en Safari de un iPhone físico.

## Ensayo antes de compartir el enlace

1. Entrar como administrador y volver al modo invitación.
2. Abrir el enlace del evento en otro móvil: información del día y explicación, sin botones para subir.
3. Dar la salida desde administración. El otro móvil debe pasar al álbum automáticamente; con conexión degradada, el fallback puede tardar hasta 30 segundos más la petición.
4. Hacer una foto y elegir otra del móvil. Probar vertical y horizontal: no deben quedar recortadas en el mosaico ni en el modo TV.
5. Con el evento abierto y Lumen cargado, activar modo avión, compartir una foto y comprobar que queda guardada localmente. Recuperar conexión y volver a Lumen: debe aparecer una sola vez.
6. Abrir el menú, modo TV, pantalla completa y ocultar controles. El botón discreto de tres puntos los restaura; Escape cierra el pase o sale primero de pantalla completa según el navegador.
7. Probar borrar una foto propia en un móvil y ver que desaparece en el otro. No borrar las fotos de los invitados como parte del ensayo.
