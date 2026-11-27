# Web

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Clausura de Líderes · TV en directo

Evento creado en Supabase para el **jueves 3 de diciembre de 2026**. Clave:
`clausura-lideres-2026`. El álbum empieza vacío, separado de la demo y de las bodas.
El seed reproducible está en `scripts/events/clausura-lideres-2026.sql`.

Tras desplegar esta versión:

- Invitados y carga previa de fotos: `/?e=clausura-lideres-2026`.
- Pantalla de la sala: `/tv?e=clausura-lideres-2026` (también desde el menú del álbum).
- El QR de TV abre la entrada de invitados en el mismo dominio. Para escanear desde
  móviles, usa la URL desplegada, no localhost.
- En TV, pulsa «•••» y «⛶» para pantalla completa, y después «Ocultar controles».
  El QR permanece visible. Flechas para avanzar; espacio para pausar. Si el sistema
  prefiere movimiento reducido, el pase empieza pausado: pulsa Reproducir.
- Sube previamente las fotos del curso con «Elegir foto». Se mantiene el límite
  actual de 10 fotos por dispositivo y evento; no hay importación masiva en esta entrega.

El pase usa las 200 fotos más recientes del evento, con una duración de 7 segundos
por imagen cargada. Las nuevas tienen prioridad en los siguientes turnos, sin cortar
la imagen actual. Supabase Realtime avisa de inserciones, modificaciones y borrados;
un refresco cada 30 segundos recupera avisos perdidos. Con mala conexión se conserva
la lista actual y se muestra el estado de reconexión. Las fotos que fallan se saltan,
y se solicita mantener la pantalla encendida cuando el navegador lo permite.

El tour de invitados aparece una vez por evento y dispositivo, utiliza la galería
real y no necesita fotos de ejemplo ni abrir la cámara durante la explicación.
La bienvenida y los textos usan el nombre y fecha del evento. La invitación ilustrada
anterior se conserva exclusivamente para el evento de Javier y Paula.

### Campos actuales de `public.events`

| Campo | Uso |
| --- | --- |
| `event_key` | Identificador del evento usado en enlaces, fotos y membresías. |
| `name`, `event_date` | Nombre visible y fecha obligatoria. |
| `uploads_open`, `opened_at` | Apertura del álbum y momento de apertura registrado por la administración. |
| `brand_color`, `banner_url` | Personalización opcional almacenada; esta versión no la aplica. |
| `photo_limit` | Configuración almacenada; el cliente actual usa el límite fijo de 10. |
| `created_at`, `created_by` | Metadatos de creación. |

No se han cambiado tablas, permisos ni políticas RLS para esta funcionalidad.
La cuenta administrativa de la boda no se asigna automáticamente al nuevo evento.
Para moderación desde `/admin`, debe existir un administrador autorizado en
`event_admins` para esta clave (no se ha asignado ninguno).
