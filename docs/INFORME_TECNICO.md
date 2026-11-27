# Lumen: auditoría técnica verificable para la defensa del TFG

**Versión examinada:** main · 592e729dc7e26a7686c57ee5cdf035ec3816b1d0.  
**Comprobaciones:** 15/09/2026, Europe/Madrid. **Cierre del informe:** 16/09/2026.  
**Objeto:** distinguir lo descrito, implementado, ejecutado y pendiente. No se evalúa una nota.

## Resumen ejecutivo

- **[Verificada por ejecución]** Pasan **107 pruebas de frontend en 15 archivos** y **22 pruebas del receptor de registros**, ejecutadas por separado y sin red. La cobertura amplia de src/app es **49,48 % sentencias, 46,80 % ramas, 43,38 % funciones y 50,02 % líneas**; supera los umbrales configurados. No prueba el recorrido completo sobre hardware o Supabase real. [E1] [E2]
- **[Documentada + observada en código]** Los resultados, PIN local y ausencia de cola persistente descritos en la memoria concuerdan con **4284e8f977e832ab5479cccca8500d3bc01bc755**, identificado expresamente en el registro de pruebas. La versión exacta entregada y el commit del despliegue de aquella entrega siguen **no verificados**. [H1] [H2]
- **[Verificada por ejecución]** En el proyecto Supabase indicado por la configuración local existen RLS y reglas de pertenencia, propiedad y administración. Las lecturas SQL ensayadas bajo anon y authenticated sin membresía devuelven cero fotos y membresías. No se crearon usuarios; no es una prueba de JWT/HTTP de extremo a extremo. [R1] [R6] [R7]
- **[Verificada por ejecución + documentada]** El bucket photos es **público**. RLS protege consultas/listados, pero la configuración permite servir archivos a quien conoce su URL. No se descargaron fotografías para ensayar ese acceso. [R1] [Documentación de Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- **[Verificada por ejecución]** La lista remota de administradores está vacía y faltan las tablas privadas/RPC de la monitorización de HEAD. **[Inferida]** Esas capacidades no están completamente aprovisionadas en la base consultada. El frontend actualmente desplegado es **no verificado**. [R2] [R3] [R4] [R5]
- **[Observada en código]** HEAD incorpora cola IndexedDB y recuperación por etapas. **[Verificada con simulaciones]** Dos invocaciones concurrentes de envío encolan dos veces; un fallo de interfaz después de guardar también permite encolar otra vez al reintentar. La doble pulsación física no se ha reproducido. [S6] [S7] [E3]
- **[Verificada por ejecución]** Hay 160 registros de fotos y 171 objetos: 15 objetos sin fila asociada por ruta y 4 filas sin objeto correspondiente. **[Pendiente]** Causa y disponibilidad HTTP: **no verificado**. [R2] [R4]
- **[Pendiente]** Publicación ≤10 s, propagación <2 s y primer uso <60 s: **no verificado**. No existe una serie reproducible de mediciones que demuestre esos límites.

**Veredicto técnico: PASS WITH RISKS. [Inferida]** Hay implementación sustancial y pruebas locales reproducibles, con límites de autorización, consistencia, configuración y validación. Significa que existe evidencia defendible con las salvedades de este informe; no certifica todos los requisitos ni la preparación de producción.

## 0. Alcance y método

**[Verificada por ejecución]** Se buscaron instrucciones en el repositorio y sus directorios superiores. No apareció un AGENTS.md aplicable al código de web. El encontrado dentro de una dependencia de agent-ops queda fuera del ámbito. Se aplicaron las habilidades [QA de Lumen][SK1], [PDF][SK2] y, en la revisión final, [Supabase][SK3].

**[Verificada por ejecución]** No se modificó aplicación, configuración de producción ni datos reales. Los entregables están en output/auditoria-tfg-2026-09-15. Las sondas adicionales y una variante de compilación se hicieron sólo en una copia aislada. Al reanudar el 16/09 apareció web/src/assets/lumen-star.svg sin seguimiento; no fue creado por esta auditoría, no se tocó ni se incluye en la versión probada.

**[Verificada por ejecución]** Se extrajo el texto de las 62 páginas de la [memoria entregada](/Users/agustinpayaalamar/Downloads/TFG_Agustin_Paya-5.pdf). SHA-256: **b9a3ef78d715c86cec760fb672fa7ff3e424103bf3e58bfd0eb7034f2e33569e**. Las páginas citadas son páginas físicas del PDF, no la numeración impresa. Las capturas de la memoria son evidencia documental histórica, no resultados actuales reejecutados.

| Etiqueta | Significado |
|---|---|
| Verificada por ejecución | Resultado observado en esta auditoría; se especifica si es simulación, compilación o consulta remota. |
| Observada en código | Implementación o regla inspeccionada, sin implicar ejecución real. |
| Documentada | Declaración de memoria, informe, handoff o documentación técnica. |
| Inferida | Consecuencia razonada del código/configuración, con condiciones y límites. |
| Pendiente | Evidencia insuficiente: **no verificado**. |

**[Verificada por ejecución]** El informe y sus evidencias no incorporan fotografías, secretos, tokens, correos, nombres de eventos ni identificadores de usuarios reales. Los UUID de las sondas son sintéticos; las rutas absolutas de referencias identifican archivos del espacio de trabajo.

## 1. Versión y trazabilidad

### 1.1 Estado observado

**[Verificada por ejecución]** Rama main; HEAD 592e729dc7e26a7686c57ee5cdf035ec3816b1d0. Al comenzar el 15/09, git status --short no devolvió cambios. Al cerrar, HEAD sigue igual y no hay diferencias en archivos versionados; se añaden los entregables y existe el SVG ajeno a la auditoría indicado arriba.

**[Observada en historial]** 4284e8f es antecesor de 10c3b5d0, seguido de cambios visuales y 592e729d. Las fechas aportan contexto, pero no son el fundamento para atribuir versión a la memoria.

### 1.2 Asociación con la memoria

**[Documentada + observada en código]** La memoria, PDF pp. 45–47, informa de 29 pruebas, cobertura amplia 4,39/6,68/3,04/4,31 y E2E 20 PASS/0 FAIL/6 SKIP. evidencias_vitest_2026-09-07.txt identifica explícitamente 4284e8f y esos resultados. datos_memoria.md identifica la misma revisión; el JSON guardado en ese commit también contiene 20/0/6. Es una asociación por contenido y revisión explícita. [H1] [H2]

**[Pendiente]** No se ha encontrado una vinculación inequívoca del PDF entregado con un commit o artefacto desplegado. **Versión exacta de la entrega: no verificado.** Se toma 4284e8f como base técnica asociada a los resultados descritos, no como certificación del binario entregado.

| Aspecto | Memoria / base 4284e8f | HEAD examinado | Evidencia |
|---|---|---|---|
| Pendientes | Blob temporal; IndexedDB como futuro. | Cola persistente y etapas. | **[Documentada / observada]** PDF p. 54; [H3], [S5], [S6]. |
| Metadatos | INSERT ordinario. | UPSERT con client_upload_id. | **[Observada]** [H5], [S3], [S16]. |
| Administración | PIN local y sessionStorage. | Auth separada y lista por evento. | **[Observada]** [H4], [S8], [S19]. |
| Storage | Sin políticas de objetos en las migraciones de esa base. | Migraciones 017 y 019. | **[Observada + catálogo verificado]** [S17], [R1]. |
| Cuota | Local global; decremento tras completar subida. | Local por evento; reserva al guardar pendiente. | **[Observada]** [H2], [S9], [S6]. |
| Pruebas | 29 utilidades; E2E 20/0/6. | 107 frontend +22 servidor; JSON histórico 22/0/4. | **[Documentada + ejecutada]** [H1], [E1], [E2], [T9]. |
| Monitorización | Registros de infraestructura. | Receptor /api/logs, cola diagnóstica y SQL 020. | **[Observada]** [S22], [S23]; dependencias remotas ausentes [R4] [R5]. |
| Presentación | Galería, visor y panel. | Apertura manual, QR compartible, pase/TV y guardado nativo. | **[Observada]** [S10], [S11], [S24]. |

**[Observada en historial]** 10c3b5d0 incorpora cola, administración nueva y migraciones 016–019; 592e729d añade monitorización y guardado. **[Inferida]** Son mejoras posteriores a la base descrita. **[Pendiente]** Su relación exacta con la fecha administrativa de entrega: **no verificado**. No atribuirles los resultados antiguos.

## 2. Arquitectura real y aportación

### 2.1 Componentes, servicios y datos

**[Observada en código]** Angular renderiza en cliente. Rutas de entrada, home y camera; admin se carga diferidamente. Memories se integra en la galería. Signals e inyección separan sesión, datos, cola, cuota, evento, feedback y logging. El builder activo es @angular/build:application; el flujo inspeccionado no usa SSR. [S1] [S2] [C1]

**[Observada en lockfile]** Angular core/CLI/build 21.1.2, Supabase JS 2.93.3, browser-image-compression 2.0.2, TypeScript 5.9.3, Vitest 4.1.9 y jsdom 27.4.0. También se usan RxJS, Howler, uqr y Tailwind. Los rangos del package.json no equivalen a versiones exactas; las anteriores proceden del lockfile. [C2]

**[Observada en código]** Supabase aporta Auth, PostgreSQL/API, Storage y Realtime. Vercel tiene salida estática, reescritura SPA y receptor /api/logs. Hay dependencias externas para fuentes Google y carga del compresor dentro del Worker desde CDN. [C3] [S25]

**[Observada en código + catálogo verificado]** Esquema principal: events; photos con ruta, dedicatoria, dispositivo, evento, propietario e id de envío; event_members con PK usuario/evento; event_admins; y storage.objects independiente de photos. photos tiene PK id, FK event_key y UNIQUE client_upload_id. owner_id admite NULL; la política exige propietario para nuevas inserciones. No se observó FK entre photos.url y objetos ni comprobación de coincidencia de sus eventos. [R1] [R4]

**[Observada en código]** Las migraciones se aplican manualmente y parten de un esquema preexistente; no constituyen necesariamente una instalación desde cero. El README enumera hasta 019 aunque existe 020. Reconstrucción de base vacía: **no verificado**. [C4]

### 2.2 Recorrido completo

1. **[Observada]** El teléfono escanea una URL con ?e=clave. Lumen procesa la clave y genera QR compartible con uqr. SessionService elige URL válida → clave almacenada válida → demo. Una clave inválida puede conservar el evento anterior. [S4] [S10]
2. **[Observada]** Bootstrap restaura/crea Auth anónimo y solicita membresía; después inicializa estado de evento y cola. Esto sucede antes del recorrido de consentimiento de entrada. [S1] [S4]
3. **[Observada]** Home consulta el evento, filtra “mis fotos” por device_id y ofrece captura/selección si hay cuota. uploads_open controla participación; se cachea por evento. [S10] [S12]
4. **[Observada]** getUserMedia produce vídeo; canvas genera JPEG. El selector proporciona File; desde Home viaja en estado de navegación. La previsualización conserva Blob/File y dedicatoria. [S7]
5. **[Observada]** Al compartir se comprime con objetivo 1 MB, dimensión máxima 1920 y Worker solicitado. [S7]
6. **[Observada]** Se guarda primero Blob comprimido y contexto en IndexedDB. Storage recibe uploads/evento/dispositivo/id.jpg; se persiste la etapa storage-uploaded. [S5] [S6]
7. **[Observada]** Se hace UPSERT en photos y se elimina el pendiente tras éxito. El progreso visual es por etapas, no una medición real de bytes subidos. [S3] [S6]
8. **[Observada]** La galería usa URLs públicas. Realtime INSERT filtra por event_key y se deduplica por id; DELETE no lleva filtro de evento y retira sólo ids de la lista local. No afirmar que todos los mensajes DELETE estén segregados por evento. [S3] [S10]

### 2.3 Aportación específica

| Base proporcionada | Lógica desarrollada para Lumen |
|---|---|
| Angular: componentes, router, DI, signals, compilación. | **[Observada]** Estados y recorridos, interfaces de captura/álbum, cuota, feedback y recuperación. |
| Supabase Auth: cuentas, tokens y persistencia del SDK. | **[Observada]** Bootstrap anónimo, adhesión a evento y sesión administrativa separada. |
| PostgreSQL/RLS: restricciones, políticas y API. | **[Observada]** Modelo de eventos, pertenencia, propiedad, apertura y funciones administrativas. |
| Storage/Realtime: archivos y notificaciones. | **[Observada]** Rutas, secuencia Storage→fila, etapas, reintentos y actualización visual. |
| Biblioteca de compresión y APIs web. | **[Observada]** Parámetros, encuadre y conexión al flujo; cola IndexedDB y guardado con alternativas. |

**[Inferida]** La aportación defendible es la lógica de dominio e integración. No es un códec, motor de autenticación, base de datos ni protocolo de tiempo real propios.

## 3. Identidad y autorización

### 3.1 Identificadores

| Elemento | Creación, almacenamiento y uso |
|---|---|
| device_id | **[Observada]** UUID en lumen_device_id y caché de instancia. Fallback Math.random. Se usa en rutas, filtros y UI; el cliente puede modificarlo. |
| Sesión anónima | **[Observada]** getSession; si falta, signInAnonymously. El SDK persiste sesión. La clave pública del proyecto no sustituye al token del usuario. |
| auth.uid() | **[Observada]** Identidad del contexto autenticado que usa SQL. Es distinta de device_id. |
| owner_id | **[Observada]** Lumen envía getUserId; SQL tiene DEFAULT auth.uid(). La política valida igualdad al insertar y usa propiedad para borrar. |
| event_members | **[Observada]** UPSERT usuario/evento tras Auth, con ignoreDuplicates en HEAD. No acredita invitación personal. |
| Administración | **[Observada]** Cliente distinto con lumen-admin-session; email confirmado, usuario no anónimo y lista por evento. |

Fuentes: [S4], [S8], [S13], [S19]. **[Verificada con simulaciones]** La sonda adicional confirma reutilización de usuario restaurado y membresía con ignoreDuplicates, no la persistencia real del SDK entre navegadores. [E3]

### 3.2 Recarga y cambios de contexto

| Acción | Resultado | Alcance |
|---|---|---|
| Recargar conservando datos | **[Inferida desde código]** Reutiliza device_id y restaura sesión; repite adhesión. | Recarga física con token válido/caducado: **no verificado**. |
| Abrir otra pestaña | **[Inferida]** Comparte almacenamiento del origen/perfil; cada instancia cachea evento. | Primer acceso simultáneo y coordinación real del SDK: **no verificado**. |
| Otro navegador/perfil | **[Inferida]** Nueva identidad local y normalmente nueva cuenta anónima. Fotos antiguas siguen en servidor pero no se reconocen automáticamente como propias. | Ensayo físico: **no verificado**. |
| Borrar localStorage | **[Verificada con simulación]** Instancia existente conserva device_id cacheado; nueva instancia genera otro. | Borrar todos los datos incluye potencialmente IndexedDB y sesión; ensayo real: **no verificado**. |
| Otro evento al reiniciar | **[Observada]** Conserva dispositivo/usuario; cambia evento, solicita membresía y usa cuota/cola de ese evento. | Cambio sólo de query dentro de una SPA ya iniciada no asegura reinicialización. |
| Pestañas A/B en eventos distintos | **[Verificada con instancias simuladas]** La clave cacheada de A no cambia al escribir B en localStorage. | **[Inferida]** A, al recargar sin ?e, puede adoptar la clave de B. Pestañas reales: **no verificado**. |
| Almacenamiento bloqueado | **[Observada]** Cuota captura excepciones; getDeviceId/initEventKey no envuelven getItem/setItem en try/catch. | Recuperación uniforme: **no verificado**. |

**[Inferida]** Si se pierde Auth y queda device_id, la UI puede llamar propias a fotos cuyo propietario real es la sesión anterior. Si cambia sólo device_id, puede ocultarlas de “mis fotos” aunque auth.uid siga siendo propietario. Reconocimiento de interfaz y autorización no son equivalentes. [S4] [S10]

### 3.3 Membresía y reglas remotas

**[Observada en código + catálogo verificado]** INSERT de membresía comprueba user_id=auth.uid; la FK exige evento existente. No requiere token separado, aprobación ni ventana temporal. Conocer una clave permite solicitar membresía propia, pero no inscribir a otra identidad. La regex controla sintaxis, no invitación. [S13] [R1]

**[Verificada por ejecución]** Los nombres remotos difieren parcialmente de los scripts: members_insert_own/members_select_own, photos_insert_own y photos_select_event. Las expresiones implementan las reglas descritas. Se verifica estado actual, no aplicación literal de cada migración ni su fecha. No se encontró una política general USING true en el conjunto consultado. [R1]

| Operación | Regla inspeccionada | Evidencia y pendiente |
|---|---|---|
| Leer sin usuario | No hay política habilitante para anon. | **[Verificada]** SELECT agregado devuelve 0. |
| Leer sin membresía | Membresía+evento abierto, o administración del evento. | **[Verificada]** Identidad SQL sintética sin membresía ve 0; JWT/HTTP **no verificado**. |
| Leer fotos ajenas del mismo evento | Permitido para miembros si abierto. | **[Observada en configuración]** Dos invitados reales: **no verificado**. |
| Leer otro evento | Necesita su membresía o administración. | **[Inferida]** Se puede solicitar adhesión con clave conocida. |
| Insertar fila | owner_id propio, miembro y evento abierto. | **[Observada en configuración]** Escritura real **no verificada**. |
| Borrar fila propia | owner_id=auth.uid; también importan las condiciones de lectura del flujo. | **[Observada en configuración]** Borrado y evento cerrado **no verificados**. |
| Borrar fila ajena | Administrador del evento. | **[Observada en configuración]** Lista administrativa vacía; borrado **no verificado**. |
| UPDATE fila/membresía | Sin política UPDATE habilitante en el conjunto consultado. | **[Observada en configuración]** GRANT no sustituye RLS. |
| Listar/leer metadatos de objetos | Miembro por carpeta, propietario o admin con fila asociada. | **[Observada en configuración]** No equivale a descargar bytes públicos. |
| Insertar objeto | Bucket photos, prefijo uploads, evento miembro/abierto, extensión jpg/jpeg y propietario Auth. | **[Observada en configuración]** No autentica device_id del camino ni inspecciona contenido por extensión. |
| Borrar objeto | Propietario Storage o admin con fila de su evento. | **[Observada en configuración]** Propietario del objeto y propietario de fila son independientes. |

Fuentes: [R1] [R3] [R4] [R6] [R7], [S13]–[S19].

**[Verificada por ejecución]** Bucket público, sin file_size_limit ni allowed_mime_types configurados. **[Inferida]** El objetivo 1 MB es de cliente, no restricción de bucket; otros límites del servicio no se han comprobado. El acceso público a bytes se distingue del control de subir/borrar. [R1] [Documentación oficial](https://supabase.com/docs/guides/storage/buckets/fundamentals)

**[Observada + inferida]** photos.url no se valida contra objeto/propietario/evento. Un cliente modificado podría asociar una ruta conocida a otra fila; eso no le otorga permiso para borrar el objeto ajeno. [S3] [R1]

**[Verificada por ejecución]** Hay GRANT amplios en photos/event_members, incluidos TRUNCATE, TRIGGER y REFERENCES. **[Inferida]** Conviene minimizarlos, pero no se ha demostrado una vía REST/RPC expuesta para ejecutar TRUNCATE. No equivale a afirmar que cualquier invitado pueda vaciar tablas. [R8]

### 3.4 PIN y administración

**[Observada en histórico]** El PIN estaba incrustado y comparado en frontend; activaba isAuthenticated y sessionStorage. No generaba otro JWT ni rol SQL. Su protección era de UI; se omite su valor. [H4]

**[Inferida]** Saltarse el PIN no basta para borrar filas ajenas bajo RLS de propiedad. Una política Storage antigua más permisiva podría haber permitido quitar el objeto y conservar la fila: riesgo condicionado histórico, no un borrado ajeno demostrado ni descripción del catálogo actual. [H2] [H5]

**[Observada + catálogo verificado]** HEAD exige cuenta no anónima, email confirmado y lista event_admins. Funciones SECURITY DEFINER usan search_path vacío y comprueban identidad/alcance. get_event_state es público para la clave dada y devuelve información de invitación/estado. [S8] [S19] [R3] [R4]

**[Verificada]** event_admins tiene 0 filas. **[Inferida]** Ninguna cuenta obtiene permisos por esa lista actualmente; registrarse no basta. **[Pendiente]** Confirmación por correo, login, apertura y moderación reales: **no verificado**.

### 3.5 Consentimiento

**[Observada]** Sólo Onboarding comprueba lumen_consent; home/camera no tienen guard. Bootstrap puede crear Auth y membresía antes de aceptar. Acceso directo a rutas evita esa pantalla. [S1] [S2] [S20]

**[Inferida]** El bloqueo global de procesamiento de imágenes de RNF-06 no está garantizado por ese control. No es una evaluación jurídica. Acceso directo ensayado con navegador: **no verificado**.



## 4. Fotografías, red y consistencia

### 4.1 Dónde queda una imagen pendiente

| Etapa | Base de memoria / 4284e8f | HEAD |
|---|---|---|
| Captura y preview | **[Observada]** rawPhotoBlob en señal. | **[Observada]** Igual; aún no se persiste en IndexedDB. |
| Selección desde Home | **[Observada]** Archivo pasado en estado de navegación. | **[Observada]** history.state.file puede reconstruir preview; su persistencia por navegador es **no verificada**, no una cola durable. |
| Compresión | **[Observada]** Resultado temporal para enviar. | **[Observada]** IndexedDB se escribe después de comprimir. |
| Pendiente durable | No existe almacén de pendientes. | **[Observada]** Blob comprimido, id, evento, dispositivo, ruta, dedicatoria, fecha, etapa, intentos y error en lumen_upload_queue/uploads. |
| Cierre del navegador | **[Inferida]** Captura sólo en señal se pierde. | **[Inferida]** Pendiente ya confirmado en IndexedDB puede recuperarse si se conservan datos; no se publica con app cerrada. |
| IndexedDB falla | No aplicable. | **[Observada]** Online: intenta publicación directa; offline: rechaza y conserva preview. La alternativa no aporta durabilidad. |

Fuentes: [H3], [S5], [S6], [S7].

**[Observada]** put resuelve al completarse la transacción IndexedDB. Procesan pendientes del evento activo: bootstrap, vuelta a Home, online, visibilidad y reintento manual. La cola refresca estado del evento y Auth/membresía antes de publicar. No hay service worker, manifiesto de instalación ni Background Sync configurados en el árbol auditado. Una recarga totalmente offline puede no cargar la aplicación: conservar el Blob no asegura una SPA disponible sin red.

**[Pendiente]** Cierre/reapertura de Safari/Chrome, expulsión de almacenamiento y recuperación de Blob real: **no verificado**. Los tests sustituyen IndexedDB por un Map. [T1]

**[Observada + inferida]** La cola no conserva owner_id original ni se particiona por usuario Auth. Si se pierde la sesión pero queda IndexedDB, metadatos pueden atribuirse al usuario actual. Si el objeto ya se subió con la sesión anterior, pueden divergir propietarios de Storage y photos. No hay reconciliación explícita; ejecución de ese escenario: **no verificado**. [S6] [S3]

### 4.2 Tres intentos frente al vector [1000, 2000, 4000]

**[Observada + verificada con pruebas de utilidad]** withRetry hace **tres intentos totales por operación**, incluido el inicial. Espera **1000 ms después del fallo 1** y **2000 ms después del fallo 2**. No espera tras el tercero. El valor **4000 no se consume** con maxAttempts=3; sería usado al ampliar intentos. [S14] [S15] [E1]

**[Observada]** Se reintentan por separado Storage.upload y escritura de metadatos (INSERT histórico, UPSERT actual). Se reintenta cualquier excepción o resultado con error, sin distinguir errores transitorios de permisos, conflictos o validación. El helper no impone un timeout global; la duración de las peticiones se añade a las esperas.

**[Inferida]** Un ciclo que llega a completar ambas etapas puede realizar hasta 3 llamadas de Storage y 3 de metadatos, con hasta **6 s de esperas programadas** entre ambas, más compresión y red. Si Storage falla definitivamente, no comienza metadatos.

**[Observada]** El callback avisa antes de esperar y utiliza el número del intento fallido. En HEAD, nuevas pasadas de cola vuelven a aplicar el helper: attempts contabiliza pasadas fallidas, no limita los intentos de toda la vida del pendiente. Online/foco/manual pueden producir más de tres llamadas acumuladas. El primer pendiente fallido detiene la pasada y puede bloquear el progreso de los posteriores. [S6]

### 4.3 Fallos parciales y duplicados

| Situación | Comportamiento / límite | Evidencia |
|---|---|---|
| Storage acepta y se pierde respuesta | Ruta estable; 409 o mensaje “already exists”/“duplicate” se interpreta como etapa completada. El clasificador no compara bytes. | **[Observada + simulada]** Clasificador probado; respuesta HTTP perdida **no verificada**. |
| Storage termina, metadatos fallan | Conserva storage-uploaded y reanuda sólo metadatos. | **[Verificada con mocks]** [T1]. |
| INSERT histórico acepta, respuesta perdida | Repetir INSERT puede crear otra fila para igual ruta. | **[Inferida desde código]** Sin idempotencia; no reproducido en DB real. [H5] |
| UPSERT actual acepta, respuesta perdida | Mismo client_upload_id + UNIQUE evita otra fila para ese id. | **[Catálogo verificado / inferida]** HTTP completo **no verificado**. [R1] |
| Dos envíos del mismo contenido | Cada enqueue obtiene otro id; no hay hash/deduplicación de contenido. | **[Verificada con mocks]** Dos invocaciones concurrentes alcanzan dos veces enqueue. [E3] [Sonda](/Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/audit-camera.spec.ts:116) |
| Feedback falla después de guardar | Catch devuelve a preview; nuevo intento encola con otro id. | **[Verificada con mocks]** Dos encolados después del fallo de feedback. [E3] [Sonda](/Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/audit-camera.spec.ts:120) |
| No se elimina pendiente tras UPSERT | Se puede reintentar mismo id; no debería crear otra fila si UNIQUE sigue aplicado. | **[Inferida]** Caída exacta posterior al commit **no verificada**. |
| Sin IndexedDB: objeto aceptado, metadatos fallan | Nuevo envío crea otra ruta; se pierde seguimiento del anterior. | **[Inferida]** Alternativa inspeccionada; red real **no verificada**. |
| Dos pestañas drenan cola | processingPromise sólo serializa una instancia. No hay lock entre pestañas. | **[Observada / inferida]** Id estable ayuda pero no prueba ausencia de carreras. |
| Falta crypto.randomUUID | Fallback genera upload-fecha-hex; columna SQL es uuid. | **[Observada / inferida]** Puede guardar objeto y fallar permanentemente al insertar fila. Rama **no ejecutada**. [S6] [R4] |

**[Observada]** [uploadPhoto](/Users/agustinpayaalamar/dev/Lumen/web/src/app/features/camera/camera.ts:579) no comprueba isUploading al entrar. El cambio de estado oculta el botón y reduce oportunidades de doble pulsación, pero no vuelve idempotente el método. **[Pendiente]** Doble pulsación física y frecuencia del problema: **no verificado**. La sonda prueba dos llamadas al método, no un defecto de gestos demostrado.

**[Inferida]** La estrategia es recuperación por etapas y deduplicación por id lógico, **no una transacción atómica ni “exactamente una vez” del contenido**. Los reintentos pueden producir efectos adicionales al crear un nuevo envío, en la variante sin persistencia o en el INSERT antiguo.

### 4.4 Borrado, objetos sin fila y cuota

**[Observada]** [El borrado invitado](/Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/supabase.service.ts:171) elimina primero objeto y luego fila. Si falla el segundo paso puede quedar fila con imagen ausente. El flujo invitado sólo comprueba errores, no cantidad de filas borradas; cero filas afectadas puede interpretarse como éxito visual y reponer cuota. Admin solicita id y exige al menos una fila, pero tampoco hay atomicidad. [S3] [S10] [S11]

**[Observada]** Cuota de 10 por evento/perfil local: reduce al persistir pendiente o, si falla IndexedDB, al completar publicación directa. Drenar pendientes no vuelve a descontar. Los pendientes ya consumen cuota, diferente de la postcondición del CU-01 de la memoria, que la reduce al terminar almacenamiento remoto. [S6] [S9]

**[Inferida]** Borrar/editar datos locales repone cuota; señales de distintas pestañas pueden guardar contadores obsoletos. Blob y cuota no comparten transacción: cerrar entre put y decrement puede desajustarlos. No se observó cuota de servidor ni devolución automática de pendientes permanentemente fallidos. El contador es una regla de UX, no protección sólida contra abuso.

**[Verificada]** Hay 15 objetos sin fila y 4 filas sin objeto por igualdad de ruta. **[Pendiente]** Causa: **no verificado**; no se atribuye a ninguna de las hipótesis anteriores ni se eliminaron objetos.

## 5. Captura, compresión y compatibilidad

### 5.1 Resolución, codificación y Worker

**[Observada]** getUserMedia solicita 1920×1080 mediante ideal, facingMode y audio=false. Sólo OverconstrainedError activa 1280×720 y después vídeo sin resolución. “Ideal” es preferencia: el navegador puede aceptar menos sin lanzar error. No se observa registro de getSettings para acreditar resolución efectiva. Resolución obtenida en hardware: **no verificado**. [S7]

**[Observada]** HEAD toma videoWidth/videoHeight, recorta al encuadre visual y redondea dimensiones del canvas. Refleja cámara frontal. toBlob codifica JPEG quality=0.95: no es el original del sensor ni la foto de máxima resolución de una cámara nativa. [S7]

**[Observada]** Compresión: maxSizeMB=1, maxWidthOrHeight=1920, useWebWorker=true. Lumen no fija initialQuality, maxIteration ni preserveExif. Biblioteca instalada: valores documentados 1, 10 y false. No hay comprobación posterior propia que rechace salida mayor de 1 MB. [Parámetros de subida](/Users/agustinpayaalamar/dev/Lumen/web/src/app/features/camera/camera.ts:579) [S25]

**[Observada en dependencia]** El source map confirma creación de Worker, importScripts y fallback a hilo principal si falta/falla Worker. libURL por defecto apunta a CDN con versión de biblioteca; Lumen no usa una copia alojada localmente. La extracción inicial en canvas tampoco se mueve al Worker por esta opción. No es defendible “nunca bloquea la interfaz”. [S25]

**[Verificada con simulaciones]** camera.spec reemplaza la compresión por devolución del archivo; capture.spec prueba plataforma por UA y colores. Ninguna demuestra reducción de bytes, calidad, EXIF, dimensiones ni Worker real. [T2] [T3]

### 5.2 Original y alternativas

- **[Observada]** Captura: conserva temporalmente JPEG previo a compresión en preview y ofrece guardarlo; no persiste automáticamente original y derivado.
- **[Observada]** Selección: no modifica el archivo del dispositivo; envía una copia tratada. El File puede viajar mediante history.state, cuya durabilidad entre cierres no está comprobada.
- **[Observada]** IndexedDB conserva versión comprimida.
- **[Inferida]** “Sin pérdida de calidad” y “resolución siempre preservada” no se sostienen: hay JPEG, reducción y recorte.
- **[Pendiente]** Comparación visual o métrica de original/subido: **no verificado**.

| Caso | Implementación y evidencia | Límite |
|---|---|---|
| Permiso denegado | **[Observada + simulada]** NotAllowedError muestra ayuda. | Diálogo nativo y recuperación real: **no verificado**. |
| Sin cámara | **[Observada]** Mensaje NotFoundError. | Equipo sin cámara: **no verificado**. |
| Restricción de resolución | **[Observada]** Cascada de restricciones. | Fallback físico: **no verificado**. |
| Compresión falla | **[Observada]** Mantiene preview y permite reintentar. | No hay envío automático del original como fallback del compresor. |
| Navegador embebido | **[Observada]** UA WhatsApp/Instagram/FBAN/FBAV, banner. | Aviso manual, no redirección garantizada. [S21] |
| Flash/enfoque/orientación | **[Observada]** Capacidades, fallback visual o captura de error. | Soporte por dispositivo: **no verificado**. |
| Formatos de selector | **[Observada]** Se envuelve entrada como image/jpeg. | Cambiar MIME no transcodifica: decodificación de HEIC/PNG/WebP depende del navegador/biblioteca; **no verificado**. |
| Guardar en móvil | **[Observada + simulada]** Web Share de archivo, segundo toque si falta activación, pulsación larga móvil o descarga escritorio. | No garantiza guardado automático en Fotos. [S24] |

**[Documentada]** La memoria propone iPhone SE, Pixel 4a y Galaxy A52 como dispositivos de evaluación. **[Pendiente]** No hay resultados reproducidos por modelo/SO/navegador: compatibilidad específica **no verificada**. Chromium headless 1280×720 no la sustituye.

## 6. Pruebas y resultados

### 6.1 Control previo de seguridad

**[Observada]** validate_plan.py apunta a producción; TC011 confirma borrado si hay foto. Incluso abrir la app puede crear Auth anónimo y membresía. No se ejecutó el validador ni casos individuales remotos. [T8]

**[Observada]** 019_launch_policy_test.sql inserta usuarios, eventos, miembros, filas y objetos aunque termine con ROLLBACK. No se ejecutó en producción: una transacción reversible no hace sus instrucciones de sólo lectura. [T10]

**[Verificada]** Pruebas en copia aislada con sandbox-exec y deny network*. El fetch de control falló con ENOTFOUND. Mocks de Supabase, fetch y compresión; sin sesiones del navegador ni npm install. Tras la primera suite se añadió prohibición de escritura al repositorio original. Dependencias locales enlazadas. [E6]

**[Verificada]** Consultas remotas en BEGIN READ ONLY/ROLLBACK: catálogo, funciones, privilegios y agregados. Dos lecturas usaron SET LOCAL ROLE y claims sintéticos locales; no crearon usuarios ni tokens. Esto prueba el motor SQL en esos contextos, no la validación de JWT del gateway.

### 6.2 Entorno y comandos

**[Verificada]** 15/09/2026: macOS 27.0, build 26A428, Darwin arm64; Node 26.0.0, npm 11.12.1, Angular 21.1.2, Vitest 4.1.9. package.json declara npm 10.8.2. Compatibilidad oficial de ese Node con Angular no verificada en este informe; ejecución local no equivale a entorno CI fijado.

Directorio de trabajo de los comandos:

~~~text
/Users/agustinpayaalamar/.codex/visualizations/2026/09/15/01a0a574-c61a-7333-acb5-55e573eebb4c/lumen-audit/isolated
~~~

Los comandos se envolvieron con sandbox-exec -f ../no-network.sb; se capturó el código real con result=$? y exit $result.

| Hora local 15/09 | Comando interior | Resultado y código |
|---|---|---|
| 16:54:40 | node node_modules/@angular/cli/bin/ng.js test --coverage --watch=false | **[Verificada]** 107/107, 15 archivos, cobertura cumple. **0**. [E1] |
| 16:55:08 | node node_modules/vitest/vitest.mjs run server/log-ingestion.spec.ts | **[Verificada]** 22/22, 1 archivo, fetch simulado. **0**. [E2] |
| 16:55:09 | NG_BUILD_MAX_WORKERS=2 node node_modules/@angular/cli/bin/ng.js build --output-path ../build | **[Verificada]** Falla descarga Google Fonts sin red. **127**. [E4] |
| 16:55:30 | node node_modules/@angular/cli/bin/ng.js test --watch=false --include="src/app/features/camera/camera.spec.ts" --include="src/app/core/services/session.service.spec.ts" | **[Verificada]** 13/13: ocho existentes + cinco sondas. **0**. [E3] |
| 16:55:41 | NG_BUILD_MAX_WORKERS=2 node node_modules/@angular/cli/bin/ng.js build --output-path ../build-no-fonts | **[Verificada]** Variante aislada sin inlining de fuentes compila con avisos. **0**. [E5] |
| 16:55 en adelante | execute_sql: SQL READ ONLY adjuntos | **[Verificada]** Resultado MCP correcto. Código de proceso: no aplica. Timestamps en JSON. [R1]–[R8] |

**[Verificada]** La variante cambia optimization de producción a scripts=true, styles=true, fonts=false sólo en la copia. Bundle inicial **711,67 kB** y **181,31 kB estimados de transferencia**: excede aviso 700 kB en 11,67 kB, no error 1 MB. La copia omite multimedia; demuestra compilación, no distribución visual completa. No se desplegó.

### 6.3 Cobertura y alcance

| Métrica | Resultado HEAD | Umbral amplio |
|---|---:|---:|
| Sentencias | **[Verificada]** 957/1934 = 49,48 % | 12 % |
| Ramas | **[Verificada]** 527/1126 = 46,80 % | 21 % |
| Funciones | **[Verificada]** 164/378 = 43,38 % | 11 % |
| Líneas | **[Verificada]** 836/1671 = 50,02 % | 12 % |

**[Observada]** Alcance: src/app/**/*.ts excluyendo specs. No es cobertura de todos los HTML, SQL, servidor, hardware o políticas remotas. [C1]

**[Verificada]** Líneas: admin.ts y admin-access.service 0 %, supabase.service 2,04 %, IndexedDB 10,52 %, cámara 34,43 %. Importar clase o ejecutar inicializador puede sumar cobertura sin ensayar sus operaciones. [E1]

**[Documentada]** En la base histórica pasaban 29 pruebas, pero el comando amplio terminaba con código 1 por incumplir umbrales. El 100 % directo correspondía a cuatro módulos importados. El registro conserva también fallo por cwd y build con salida 134: no son éxitos. [H1]

**[Observada]** test:coverage invoca Vitest directo y theme-coverage.js, no el builder Angular; la configuración directa no contiene los umbrales amplios. Ese script compuesto no fue ejecutado ni aprobado en esta auditoría. [C1] [C2] [C5]

### 6.4 Aserciones, simulaciones y omisiones

| Grupo | Qué comprueba | Qué no demuestra |
|---|---|---|
| retry | **[Verificada]** Intentos, esperas simuladas, errores y callbacks. | Red y tiempos reales. |
| capture | **[Verificada]** UA y color de contador. | Cámara/canvas/Worker. |
| download/save-photo | **[Verificada]** Anclas, object URL, ramas Web Share/fallback. | Guardado en carrete físico. |
| UploadQueue | **[Verificada]** Offline sin backend, etapas, pausa, errores y concurrencia interna con Map. | IndexedDB real, cierres, pestañas o RLS. |
| Cámara | **[Verificada]** Estados de fallo/guardado y permiso denegado simulado. | Template sustituido por vacío; compresión mock. No recorrido visual. |
| Sesión/cuota/evento | **[Verificada]** Cachés, errores, cuota y RPC simuladas. | JWT/servidor real. |
| Home/Memories/onboarding | **[Verificada]** Estados, orden, navegación, consentimiento; Memories usa DOM/tiempo simulado. | Dos móviles reales; parte de plantillas se sustituye. |
| Diagnóstico/receptor | **[Verificada]** Saneado, límites, colas y contrato de alertas con mocks. | Supabase/Telegram operativos; no se enviaron mensajes. |

Fuentes: [T1]–[T7], [E1]–[E3].

### 6.5 E2E histórico y posibles falsos positivos

- **[Documentada]** El plan tiene 34 casos; validador incluye 26. Base: 20/0/6; JSON actual: 22/0/4. Sin commit de despliegue suficiente, no se atribuye el informe antiguo a HEAD. [T9]
- **[Observada]** TC028 sólo comprueba clave en localStorage y grid/empty-state. Vacío por falta de membresía o error puede satisfacerlo; no prueba dos eventos y sus permisos.
- **[Observada]** TC004 pulsa dos veces el botón de entrada, no publicación.
- **[Observada]** TC032 puede marcar PASS sin ver “Guardando”, aunque espere descarga; no acredita guardado móvil.
- **[Observada]** TC029/TC030 imprimen SKIP: son stubs sin inyección de fallos. El comentario de unos 7 s no cambia las esperas reales de 1+2 s por etapa.
- **[Observada]** Pruebas de PIN cubren UI antigua, no privilegio de servidor, y no sirven para Auth administrativo actual.
- **[Inferida]** Casos planificados, incluidos, ejecutados y superados son conjuntos distintos; un SKIP no es éxito.
- **[Documentada]** Los 0,57 s del curl de la memoria son una transferencia concreta sin captura/compresión; el rechazo de INSERT events con clave pública prueba un contexto distinto al invitado con Auth. PDF pp. 46–47.
- **[Documentada / pendiente]** Lighthouse y registros de infraestructura de PDF pp. 48–50 no se repitieron; no demuestran 10/2/60 s. Resultado actual: **no verificado**.



## 7. Matriz de objetivos y requisitos

**[Documentada]** Objetivos: PDF p. 12. Requisitos: PDF pp. 18–21. Las filas describen HEAD salvo indicación histórica. “NV” significa **no verificado**.

### 7.1 Tres objetivos

| Objetivo | Implementación y evidencia disponible | Verificación pendiente |
|---|---|---|
| OE1: multitenencia e integridad | **[Observada + catálogo/lectura verificados]** event_key, membresía, propiedad, FK y RLS; lectura negativa sin pertenencia. | **[Pendiente]** Matriz HTTP propios/ajenos/dos eventos y Storage. El bucket público limita privacidad de bytes. Aislamiento completo NV. |
| OE2: compatibilidad y resiliencia | **[Observada + simulada]** Alternativas de cámara, selección, compresión, retry y cola posterior a la base de memoria. | **[Pendiente]** Hardware, Worker, cierres/reconexión y durabilidad por navegador: NV. |
| OE3: calidad y robustez | **[Verificada]** 107+22 pruebas, cobertura y cinco sondas nuevas; resultados históricos identificados. | **[Pendiente]** E2E actualizado aislado, carga y fallos distribuidos. Validación integral del flujo: NV. |

### 7.2 Requisitos funcionales

| RF | Implementación y evidencia | Límite / pendiente |
|---|---|---|
| 01–03 entrada, acceso y persistencia | **[Observada + simulada]** Onboarding y flags locales. [S20] [T7] | QR físico NV; rutas directas evitan la pantalla. |
| 04 cámara progresiva | **[Observada]** 1920→1280→genérica ante error. [S7] | Resolución/fallback reales NV. |
| 05 feedback | **[Observada]** Háptico, audio y visual. | Hardware NV. |
| 06 conmutación de cámara | **[Observada]** Botón y doble toque. [S7] | Latencia “inmediata” NV; usa temporizadores. |
| 07 flash y cuadrícula | **[Observada]** Controles y alternativas. [S7] | Linterna real NV. |
| 08 archivos locales | **[Observada]** Selector/File a preview. [S7] | Formatos por dispositivo NV. |
| 09 preview y dedicatoria | **[Observada]** Blob/señal y metadatos. [S7] [S3] | No durabilidad garantizada antes de compartir. |
| 10 compresión Worker ≤1 MB | **[Observada]** Parámetros y biblioteca. [S7] [S25] | Worker, tamaño y fluidez NV; fallback a hilo principal. |
| 11 retry | **[Verificada con mocks]** 3 intentos y 1/2 s por etapa. [E1] [S14] | Red real NV; también reintenta errores permanentes. |
| 12 Realtime | **[Observada + catálogo verificado]** Suscripciones y publicación photos/events. [S3] [R1] | Dos clientes y latencia NV. |
| 13 global/propias | **[Observada + simulada]** Filtrado device_id. [S10] [T5] | Reconocimiento, no prueba de identidad. |
| 14 visor/gestos | **[Observada]** Visor y navegación. [S10] | Gestos físicos NV. |
| 15 borrado propio | **[Observada + catálogo verificado]** Confirmación y propiedad. [S3] [S10] | Borrado completo NV; no atómico. |
| 16 guardar Blob | **[Observada + simulada]** Web Share/fallback. [S24] | Guardado forzado en Fotos NV; comportamiento ha cambiado. |
| 17 cuota 10 | **[Observada + simulada]** Local por evento. [S9] | Evitable; no cuota de servidor. |
| 18 multitenencia | **[Observada + lectura negativa verificada]** Filtro y RLS. [S4] [R6] [R7] | Aislamiento total NV; clave conocida permite adhesión. |
| 19 embebidos | **[Observada]** Banner por UA. [S21] | Detección exhaustiva/salida automática NV. |
| 20 tour 6 pasos | **[Observada / documentada]** Servicio, secuencia y E2E histórico. | Recorrido actual completo NV. |
| 21 PIN | **[Observada históricamente]** PIN de cliente. [H4] | Sustituido por Auth en HEAD; no presentar como igual mecanismo. |
| 22 supervisión y moderación | **[Observada]** Admin carga/refresca, descarga y borra autorizado. [S11] | Lista admin vacía. Admin HEAD no conserva suscripción de fotos del panel antiguo; supervisión automática actual NV. |

### 7.3 Requisitos no funcionales

| RNF | Evidencia | Evaluación |
|---|---|---|
| 01 no bloquear interfaz | **[Observada]** Worker solicitado. | **[Pendiente]** Fluidez NV; existe fallback principal. |
| 02 publicación ≤10 s | **[Documentada]** Objetivo; transferencia histórica aislada. | **[Pendiente]** **No verificado**: faltan condiciones, inicio/fin y serie temporal. |
| 03 propagación <2 s | **[Observada]** Realtime implementado. | **[Pendiente]** **No verificado**: falta aceptación→pintado en segundo cliente. |
| 04 HTTPS/TLS | **[Observada]** URLs HTTPS. | **[Pendiente]** Cabeceras, TLS y despliegue actual NV. |
| 05 RLS | **[Verificada parcialmente]** Catálogo y dos lecturas negativas. | **[Pendiente]** HTTP completo NV; no privacidad de bytes públicos. |
| 06 consentimiento | **[Observada]** En onboarding. | **[Inferida]** No cubre rutas directas ni bootstrap; bloqueo global no garantizado. |
| 07 formato event_key | **[Observada]** Regex 3–40 caracteres. [S4] | **[Inferida]** No demuestra invitación ni entropía. |
| 08 multiplataforma | **[Observada / documentada]** UI y APIs. | **[Pendiente]** Safari/Chrome físicos NV. |
| 09 embebidos | **[Observada]** Aviso manual. | **[Pendiente]** Redirección/soporte completo NV. |
| 10 primer uso <60 s | **[Documentada]** Objetivo. | **[Pendiente]** **No verificado**: no estudio cronometrado con usuarios nuevos. |
| 11 feedback | **[Observada]** Servicio integrado. | **[Pendiente]** Percepción y hardware NV. |
| 12 errores globales | **[Verificada con simulación]** Handler y pantalla de recuperación. | **[Inferida]** No garantiza recuperarse de cualquier excepción. |
| 13 tour | **[Observada]** Ayuda en demo. | **[Pendiente]** E2E actual NV. |
| 14 modularidad | **[Observada]** Features, servicios y utilidades. | **[Inferida]** Evolución supera las cuatro pantallas originales. |
| 15 constantes | **[Observada]** Claves, cuota y retry centralizados. [S15] | **[Observada]** Quedan cifras locales de tiempos/compresión. |
| 16 despliegue automático | **[Observada / documentada]** Git y Vercel. | **[Pendiente]** Conexión de main, gates y commit desplegado NV. |

**[Observada]** El respaldo de EventService cada 30 s actualiza apertura de evento, no establece SLA de fotos. Home carga antes de suscribirse; no se observa resincronización explícita al recibir SUBSCRIBED. El evento online no detecta toda caída de WebSocket. **[Inferida]** Son ventanas de actualización que conviene probar, no pérdidas reales demostradas. [S10] [S12]

## 8. Agregados remotos autorizados

**[Verificada por ejecución]** Snapshot del **15/09/2026, 14:56:21 UTC / 16:56:21 Europe/Madrid**, proyecto obtenido de configuración local. Sólo conteos y catálogo; no filas de negocio ni archivos. Consultas reproducibles adjuntas. [R2]

| Magnitud | Valor |
|---|---:|
| Eventos / abiertos | 3 / 3 |
| Filas de fotos / rutas distintas | 160 / 160 |
| device_id distintos en fotos | 38 |
| owner_id distintos no nulos | 22 |
| Fotos sin owner_id | 77 |
| Fotos sin client_upload_id | 81 |
| Membresías / user_id distintos en ellas | 271 / 265 |
| Entradas de administración | 0 |
| Objetos photos / sin propietario Storage | 171 / 88 |
| Objetos sin fila photos por ruta | 15 |
| Filas photos sin objeto | 4 |

**[Verificada]** E1–E3 son etiquetas anónimas del resultado, no claves de acceso:

| Evento | Fotos | device_id distintos | owner_id distintos no nulos | Membresías |
|---|---:|---:|---:|---:|
| E1 | 4 | 1 | 1 | 167 |
| E2 | 79 | 21 | 21 | 104 |
| E3 | 77 | 16 | 0 | 0 |

**[Inferida]** No son invitados, personas únicas, sesiones activas ni concurrencia. Un dispositivo se puede regenerar/compartir; una cuenta puede tener varias membresías; un miembro puede no subir fotos y puede ser de pruebas. Las fotos históricas sin propietario no reconstruyen autoría personal.

**[Inferida]** Los 15 objetos sin fila son candidatos a revisión, no necesariamente basura: pueden ser auxiliares, pruebas o subidas parciales. Las cuatro filas sin objeto usan rutas relativas, no URL externa; disponibilidad HTTP **no verificada**. No se borró nada. [R4]

**[Documentada]** La memoria declara uso en dos eventos y más de 150 asistentes en uno. Asistencia no es simultaneidad. Los agregados no prueban ni refutan ese número de personas. PDF p. 50.

## 9. Preparación de la defensa

### 9.1 Cinco afirmaciones defendibles

1. **[Observada + verificada parcialmente]** “Hay separación de registros por evento y autorización de pertenencia/propiedad en PostgreSQL; he comprobado catálogo y lecturas negativas sin membresía.” Añadir que los archivos del bucket son públicos. [R1] [R6] [R7]
2. **[Verificada]** “Esta revisión supera 107 pruebas frontend y 22 del receptor sin red; cobertura amplia de líneas 50,02 %, con áreas relevantes no cubiertas.” [E1] [E2]
3. **[Observada + simulada]** “Cada etapa reintenta hasta tres veces y espera 1 y 2 segundos; el 4000 del vector no se usa en la configuración normal.” [S14]
4. **[Observada + simulada]** “HEAD añade cola persistente y recuperación entre Storage y metadatos, futura en la memoria.” Añadir que cierres reales en móviles no están verificados. [S5] [S6] [T1]
5. **[Observada]** “La aportación es integrar dominio, identidad por evento, captura/selección, recuperación y galería sobre Angular/Supabase.” No atribuirse las capacidades internas de esas plataformas.

### 9.2 Cinco afirmaciones que matizar o evitar

1. **[Inferida]** “Álbum privado: nadie ajeno ve fotos.” Bucket público y adhesión con clave conocida.
2. **[Inferida]** “Sin pérdida de calidad; siempre se conserva el original.” Hay JPEG, reducción y recorte.
3. **[Pendiente]** “Cumple 10/2/60 segundos y soporta 150 usuarios simultáneos.” **No verificado**.
4. **[Inferida]** “Offline completo, ninguna pérdida y nunca duplicados.” Preview no durable, sin service worker, almacenamiento limitado y dos encolados reproducidos.
5. **[Inferida]** “100 % probado y administrador protegido por PIN.” Cobertura histórica parcial; PIN sólo UI; lista administrativa actual vacía.

### 9.3 Diez preguntas técnicas probables

| Pregunta | Respuesta basada en evidencia |
|---|---|
| 1. ¿device_id es el usuario? | **[Observada]** No; es identificador editable local para UI. Auth tiene otro id y RLS usa auth.uid. Pueden desincronizarse. |
| 2. ¿Cómo separas eventos? | **[Observada + verificada parcialmente]** Filtros de cliente y membresía en servidor; lectura negativa probada. Conocer clave permite adhesión y los bytes públicos tienen otro control de acceso. |
| 3. ¿Qué pasa al borrar datos del navegador? | **[Inferida + simulada]** Pierde reconocimiento, potencialmente sesión y pendientes. No hay recuperación por persona; la nueva sesión no es propietario anterior. |
| 4. ¿Qué reintentas? | **[Observada]** Storage y escritura de fila por separado; la cola recuerda etapa. Actualmente se reintentan también errores permanentes. |
| 5. ¿Cómo evitas duplicados por respuesta perdida? | **[Observada + catálogo verificado]** Ruta estable y UNIQUE por envío. Otro enqueue obtiene otro id: no deduplica contenido ni garantiza exactamente una vez. |
| 6. ¿Sobrevive el pendiente al cierre? | **[Observada / pendiente]** Memoria: Blob temporal. HEAD: IndexedDB tras compartir; persistencia física por navegador todavía no verificada. Reabrir para publicar. |
| 7. ¿Siempre se usa Worker? | **[Observada]** Se solicita; la biblioteca cae a hilo principal. Las pruebas simulan compresión. Fluidez real no medida. |
| 8. ¿El PIN da privilegios? | **[Observada históricamente]** No, sólo bandera UI. HEAD usa Auth y lista por evento, actualmente vacía en base consultada. |
| 9. ¿Qué significa cobertura? | **[Verificada]** Código src/app ejecutado por suite local. No corrección total ni RLS, hardware, todo el DOM o rendimiento real. |
| 10. ¿Y si Storage borra pero DB falla? | **[Observada / inferida]** Puede quedar fila rota: no hay transacción conjunta. Admin comprueba fila afectada; invitado sólo errores. Hace falta reconciliación. |

### 9.4 Dos retos técnicos sólidos

#### A. Acceso sin registro visible y autorización por evento

**[Observada] Problema:** reducir pasos desde QR sin confundir reconocimiento local con propiedad del servidor.

**[Observada] Decisión:** Auth anónimo persistido, membresías, owner_id y RLS; sesión de administración separada para no sustituir la identidad invitada.

**[Inferida] Alternativa:** cuentas explícitas o token de invitación de alta entropía distinto de event_key, canjeado por membresía. Más control de incorporación a cambio de gestión adicional.

**[Verificada / inferida] Límite:** admin sin aprovisionar, adhesión que sólo prueba conocimiento de clave y Storage público. Separar diseño histórico, evolución de HEAD y configuración pendiente.

#### B. Publicación en dos servicios con conectividad inestable

**[Observada] Problema:** Storage y PostgreSQL pueden aceptar pasos separados o perder respuestas; no hay commit común.

**[Observada] Decisión:** retry por etapa; evolución a IndexedDB, id estable, stage persistido y UPSERT.

**[Inferida] Alternativa:** backend que registre intención, finalice publicación y reconcilie objetos; o zona temporal de subida seguida de confirmación. Más infraestructura, menos recuperación distribuida en navegador.

**[Verificada / inferida] Límite:** mocks no prueban red real; no deduplica contenido ni coordina pestañas, y el borrado no es atómico. Los agregados justifican revisar correspondencias pero no atribuyen sus causas.

### 9.5 Demostración reproducible de máximo 90 segundos

**[Pendiente: propuesta, no ejecutada]** Preparar una instancia desechable separada con datos sintéticos, dos sesiones invitadas y administrador de prueba autorizado. Comprobar Auth, esquema, RLS y bucket antes del ensayo; las migraciones no son un bootstrap completo. Usar imágenes geométricas sin personas y texto neutro. Verificar que el frontend apunta sólo a pruebas: un evento llamado demo en producción no es un entorno aislado.

| Tiempo | Acción | Qué muestra |
|---|---|---|
| 0–15 s | QR de prueba en A, consentimiento y entrada. | Flujo de acceso; sin mostrar tokens. |
| 15–35 s | Seleccionar imagen sintética, compartir; B ya está en galería. | Imagen en B. Cronómetro ilustrativo, no certificación de umbral. |
| 35–50 s | Desconectar A; seleccionar otra imagen y compartir. | Confirmación de pendiente local y contador. |
| 50–70 s | Recuperar conexión y volver a A. | Cola drenada; en B aparece; consulta agregada de prueba confirma una fila para ese id. |
| 70–85 s | Filtro de propias y explicación de device_id/RLS. | Reconocimiento frente a autorización. |
| 85–90 s | Explicar límite. | No mide carga ni compatibilidad universal. |

**[Inferida]** No añadir cierre/reapertura completa offline hasta probar carga de app sin service worker. Ensayar con mismos equipos/red/datos antes de la defensa; si falta preparación, mostrar evidencias locales sin afirmar demo remota exitosa.

### 9.6 Tres comprobaciones adicionales prioritarias

1. **[Pendiente] Autorización y consistencia en entorno desechable.** Dos eventos, dos invitados, tercero sin membresía y admin. Matriz REST/Storage con JWT propios: lectura, listado, URL pública, inserción/borrado propio y ajeno, metadatos con ruta de otro evento y cierre. Verificar filas/objetos, no sólo UI. Guardar catálogo, versión y resultados.
2. **[Pendiente] Resiliencia real en Safari/Chrome físicos.** IndexedDB, cierre/recarga, respuesta perdida tras Storage/UPSERT, doble pulsación, dos pestañas, cambio de sesión y almacenamiento denegado. Comprobar IDs, cuota y cardinalidad; distinguir preview y pendiente durable. Medir Worker/fallback.
3. **[Pendiente] Protocolo de tiempos 10/2/60 s.** Fijar inicio/fin: captura/selección→publicación, separando revisión humana; aceptación→imagen pintada en receptor con relojes alineados; QR→primera publicación con usuarios nuevos. Registrar equipo, navegador, tamaño, red, muestras, fallos y percentiles. No sustituir máximos por medias.

## 10. Límites y reproducción

**[Pendiente]** No verificados: commit desplegado en Vercel, correspondencia binaria con HEAD, configuración de proveedores Auth, renovación JWT, email, TLS, cámara física, Worker real, HTTP de fotos, carga, simultaneidad y entrega de logs/Telegram. No se cambió ninguna configuración remota.

**[Verificada]** Faltan tablas privadas y RPC requeridas por monitorización de HEAD en la base consultada. **[Inferida]** Ese backend no puede satisfacer las RPC de esa implementación sin desplegar dependencias. Tener 22 tests no demuestra monitorización operativa. Configuración Vercel del receptor: **no verificado**. [R4] [R5] [S22] [S23]

**[Documentada]** Los handoffs que afirman migraciones “aplicadas” se trataron como documentación. El catálogo actual acredita reglas actuales, no ejecución histórica de scripts ni despliegue frontend.

### Reproducción sin tocar producción

~~~sh
git branch --show-current
git rev-parse HEAD
git status --short
git show HEAD:evidencias_vitest_2026-09-07.txt
git show 4284e8f:web/testsprite_tests/validation_report.json
git show 4284e8f:web/src/app/features/camera/camera.ts
git diff 4284e8f HEAD -- web/src/app web/scripts/migrations
~~~

**[Observada en historial]** El registro de pruebas se añadió después de 4284e8f aunque identifica pruebas sobre él: no buscar ese archivo dentro de ese commit.

**[Inferida]** Para repetir tests, copiar web a un directorio aislado con las mismas dependencias, bloquear red y ejecutar tabla de comandos. Las dos specs audit-* adjuntas contienen las cinco sondas y se colocan sólo en la copia. No ejecutar E2E de producción ni SQL de fixtures sobre datos reales. Los SQL de evidencias son READ ONLY.

**[Verificada]** Se adjuntan consultas y resultados remotos agregados, logs locales, perfil de aislamiento y extractos históricos con PIN omitido. Los códigos de salida de la tabla proceden de la invocación de herramientas; los logs redirigidos no contienen todos ellos. Los enlaces al código actual corresponden a HEAD; los extractos históricos incluyen su numeración original. No se han rehecho pruebas el 16/09.

## Referencias verificables

Los enlaces remiten a una línea de partida del archivo. La etiqueta de conclusión determina el alcance: un comentario de código no es prueba de funcionamiento.



[S1]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/app.config.ts:22

[S2]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/app.routes.ts:6

[S3]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/supabase.service.ts:49

[S4]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/session.service.ts:51

[S5]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/pending-upload-store.service.ts:18

[S6]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/upload-queue.service.ts:77

[S7]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/camera/camera.ts:183

[S8]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/admin-access.service.ts:9

[S9]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/photo-limit.service.ts:29

[S10]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/home/home.ts:171

[S11]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/admin/admin.ts:38

[S12]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/event.service.ts:29

[S13]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/012_event_members_rls.sql:106

[S14]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/utils/retry.ts:37

[S15]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/constants.ts:24

[S16]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/016_photos_client_upload_id.sql:12

[S17]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/017_harden_storage_and_enable_realtime.sql:53

[S18]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/015_photos_delete_owner_only.sql:15

[S19]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/019_event_launch_and_admin.sql:17

[S20]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/onboarding/onboarding.ts:20

[S21]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/app.ts:21

[S22]: /Users/agustinpayaalamar/dev/Lumen/web/server/log-ingestion.ts:139

[S23]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/020_observability.sql:1

[S24]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/utils/save-photo.ts:20

[S25]: /Users/agustinpayaalamar/dev/Lumen/web/node_modules/browser-image-compression/README.md:119

[C1]: /Users/agustinpayaalamar/dev/Lumen/web/angular.json:78

[C2]: /Users/agustinpayaalamar/dev/Lumen/web/package.json:1

[C3]: /Users/agustinpayaalamar/dev/Lumen/web/vercel.json:1

[C4]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/migrations/README.md:3

[C5]: /Users/agustinpayaalamar/dev/Lumen/web/vitest.config.ts:4

[H1]: /Users/agustinpayaalamar/dev/Lumen/evidencias_vitest_2026-09-07.txt:1

[H2]: /Users/agustinpayaalamar/dev/Lumen/datos_memoria.md:3

[T1]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/services/upload-queue.service.spec.ts:81

[T2]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/camera/camera.spec.ts:14

[T3]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/utils/capture.spec.ts:14

[T4]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/core/utils/retry.spec.ts:1

[T5]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/home/home.spec.ts:1

[T6]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/memories/memories.spec.ts:1

[T7]: /Users/agustinpayaalamar/dev/Lumen/web/src/app/features/onboarding/onboarding.spec.ts:1

[T8]: /Users/agustinpayaalamar/dev/Lumen/web/testsprite_tests/validate_plan.py:425

[T9]: /Users/agustinpayaalamar/dev/Lumen/web/testsprite_tests/validation_report.json:1

[T10]: /Users/agustinpayaalamar/dev/Lumen/web/scripts/audit/019_launch_policy_test.sql:1

[E1]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/angular-tests.log:1

[E2]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/server-tests.log:1

[E3]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/audit-probes.log:1

[E4]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/build.log:1

[E5]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/build-no-fonts.log:1

[E6]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/no-network.sb:1

[H3]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/historico-4284e8f-camera.ts.txt:1

[H4]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/historico-4284e8f-admin.ts.txt:1

[H5]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/historico-4284e8f-supabase.service.ts.txt:1

[R1]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/catalogo-remoto.json:1

[R2]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/agregados-remotos.json:1

[R3]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/funciones-remotas.json:1

[R4]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/detalles-remotos.json:1

[R5]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/tablas-monitorizacion.json:1

[R6]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/lectura-rol-anon.json:1

[R7]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/lectura-sin-membresia.json:1

[R8]: /Users/agustinpayaalamar/dev/Lumen/output/auditoria-tfg-2026-09-15/evidencias/privilegios-remotos.json:1

[SK1]: /Users/agustinpayaalamar/.codex/plugins/cache/personal/lumen-agent-ops/0.1.0/skills/lumen-qa/SKILL.md:1

[SK2]: /Users/agustinpayaalamar/.codex/plugins/cache/openai-primary-runtime/pdf/26.904.11930/skills/pdf/SKILL.md:1

[SK3]: /Users/agustinpayaalamar/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md:1
