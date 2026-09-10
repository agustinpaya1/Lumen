# Backlog PO/BA · Pulido de acceso, onboarding, galería y cámara

## Decisión

Usuario: invitado móvil que entra por primera vez, consulta ubicaciones y aporta fotos.
Necesidad: reconocer acciones, ver el opening tras consentir y obtener una galería con ritmo
vertical coherente. Resultado: flujo comprensible sin sacrificar carácter ni compatibilidad.

## Alcance

- **LUM-35:** convertir los enlaces `Cómo llegar` en controles visualmente inequívocos, manteniendo
  URL, texto accesible y apertura en nueva pestaña.
- **LUM-36:** al aceptar el consentimiento, cerrar la hoja y permanecer en el opening. `Entrar a la
galería` realiza la navegación. Quien ya completó el opening puede seguir entrando directamente.
- **LUM-37:** usar columnas de igual ancho y variar únicamente la altura de las miniaturas. El visor
  conserva la foto completa. Una única foto se muestra centrada y con ancho moderado.
- **LUM-38:** el modo flash no mantiene la linterna encendida. Si el navegador expone torch, se
  activa solo durante la captura; siempre existe un parpadeo visual breve como fallback.

## Criterios de aceptación

- Los dos enlaces de ubicación parecen botones-enlace, tienen contraste AA y foco visible.
- Aceptar consentimiento no cambia de ruta; pulsar `Entrar a la galería` sí.
- A 320–430 px las columnas tienen el mismo ancho y alturas alternas, sin overflow.
- Con una foto, la tarjeta no ocupa todo el viewport ni adopta el patrón alterno.
- Activar flash no enciende torch; capturar intenta un pulso y lo apaga también ante fallo.

## Riesgos y handoff

El recorte afecta solo a miniaturas; el visor sigue mostrando el original. Torch depende de soporte
real del navegador/dispositivo. Rutas: home, onboarding y camera. Presupuesto Balanced; QA con tests,
build, responsive y flujo de consentimiento. El pulso hardware queda como riesgo físico abierto.
