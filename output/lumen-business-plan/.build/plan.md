# Lumen
## Plan de negocio y salida al mercado
28 de septiembre de 2026 · Mercado español · Preparado para Agustín Payá Alamar

**Recomendación:** comercializar primero un álbum colaborativo de boda con pago por evento. Vender directamente a parejas para aprender qué compran y probar masías, fincas y wedding planners como canal de repetición. Reservar la suscripción profesional para cuando varios negocios hayan pagado por usar Lumen de nuevo.

La siguiente meta debería ser **10 bodas pagadas, 3 colaboradores compradores y 5 eventos consecutivos sin intervención rutinaria del fundador durante la celebración**, con entrega del álbum completada. Son umbrales propuestos, no resultados actuales. Dos eventos satisfactorios demuestran uso real; todavía no demuestran disposición a pagar, coste de adquisición ni autonomía.

El producto ya tiene QR, fotos y dedicatorias, galería, pase de recuerdos, recuperación de subidas y administración por evento. Falta convertirlo en un servicio que la pareja compre, configure, use y descargue por sí misma. La prioridad es privacidad, fiabilidad y entrega; después, automatizar las tareas comerciales que se repitan.

| Decisión | Propuesta inicial |
|---|---|
| Qué vender | Reunir fotos de invitados y entregar un álbum completo con una experiencia sencilla en español |
| Quién paga | La pareja o un espacio/wedding planner que compra eventos |
| Precio B2C a probar | 99 € por boda, IVA incluido; contrastar con 79 € y después 129 € |
| Precio profesional a probar | 59 € + IVA por evento; pack de 5 por 245 € + IVA |
| Qué aplazar | RSVP, mesas, vídeo, reconocimiento facial, app nativa y marketplace |
| Qué medir | Compras, repetición, contribución y minutos de soporte |

**Viabilidad orientativa:** el modelo de este plan deja unos 7.112 € anuales con 300 bodas y 28.079 € con 1.000, antes de impuestos, desarrollo y trabajo general del fundador. Incluye soporte imputado. Encaja inicialmente como negocio pequeño y disciplinado; vivir de él exige volumen, precio superior validado o más margen.

El informe contiene diagnóstico, competencia, oferta, economía, validación de 90 días, requisitos de lanzamiento y operación autónoma. Las cifras económicas son hipótesis salvo fuente indicada. La revisión del repositorio es estática: no acredita el estado del despliegue actual. Las fuentes y rutas se recogen al final.

<!-- PAGE -->
# 1 Producto actual y evidencia pendiente

La presentación adjunta describe un proyecto académico de contenido multimedia colaborativo. El código actual concreta el producto como **álbum de fotografías para invitados**. No encontré una plataforma integral de planificación de bodas. Esa delimitación permite vender un resultado entendible y evita ampliar alcance por inercia.

| Capacidad | Estado observado | Implicación comercial |
|---|---|---|
| QR y acceso sin alta visible | Sesión anónima y pertenencia | Reduce pasos; no es exclusivo |
| Cámara y selección del móvil | Una foto cada vez y dedicatoria | Suficiente para validar el núcleo |
| Galería y recuerdos | Tiempo real, fotos propias, pase TV | Experiencia utilizable hoy |
| Recuperación de subidas | Cola IndexedDB y reintentos | Aprovechar y probar en móviles |
| Administración por evento | Correo verificado, moderar y abrir | Falta alta y recuperación autónoma |
| Configuración de boda | Parcial; hay datos fijos en pantallas | Exige preparación técnica |
| Compra y entrega completa | Sin checkout ni exportación masiva observados | Impide autoservicio comercial |
| RSVP, vídeos y juegos | No observados; hay ideas fotográficas | No anunciarlos como existentes |

El README y parte del TFG describen estados anteriores. **Autenticación, cola y registro de errores ya tienen implementaciones posteriores.** El informe del 15/09 recogía dependencias de observabilidad sin desplegar: hoy hay que verificar el circuito, no darlo por operativo ni rehacerlo por defecto. [I1–I5]

**Conocido:** declaras dos eventos exitosos. **Inferido:** el flujo se ha utilizado en un entorno real. **Pendiente:** precio aceptado, participación sin tu impulso, horas de preparación, incidencias y canal repetible. Una encuesta positiva mide experiencia; no prueba compra.

Reconstruir ambos casos con los organizadores: asistentes estimados, dispositivos que aportaron, fotos válidas, incidencias, minutos de ayuda y alternativa que habrían usado. No convertir dispositivos en personas ni los agregados de una base de datos en asistentes por boda.

**Promesas que deben ajustarse:** la subida comprime a 1 MB y 1920 píxeles de lado máximo; no ofrecer originales ni ausencia de pérdida. La cola recupera pendientes al volver con conexión, pero no garantiza publicación con el navegador cerrado. No anunciar privacidad estricta mientras los archivos se sirvan públicamente y la autorización no corresponda a esa promesa. [I2–I4]

La oportunidad es mejorar la recogida de recuerdos y la operación del organizador. El riesgo principal es confundir satisfacción de familiares con demanda de desconocidos dispuestos a pagar.

<!-- PAGE -->
# 2 Mercado español y competencia

El INE contabilizó **175.364 matrimonios en 2024**, un 1,7 % más que en 2023, en resultados definitivos publicados el 19/11/2025. Son matrimonios registrados, no celebraciones que necesariamente comprarían Lumen. [S1]

Bodas.net sitúa el gasto medio en **25.183 €** en su informe 2026, basado en más de 2.000 parejas casadas en 2025; excluye luna de miel y anillo. Es una muestra comercial, no todo el mercado. Un presupuesto de boda elevado no demuestra disposición a pagar por un álbum. [S2]

Precios consultados el 28/09/2026, en moneda original. Salvo indicación, impuestos no explicitados; confirmar importe final. Prestaciones y promociones varían por plan.

| Alternativa | Precio observado | Consecuencia para Lumen |
|---|---|---|
| Wedibox | Wedding 49 USD; All-in-One 79 USD | QR sin app y funciones multimedia/boda |
| Wedibox profesional | 195 USD/5; 320 USD/10; 500 USD/20 | B2B ya competido: 25–39 USD/evento |
| Guestpix | Classic 39 €; Signature 79 €; Bundle 99 € | Competidor directo; bundle de 3 galerías |
| WedUploader | Premium 29 € una vez | Alternativa económica con Google Drive |
| ParaSiempre | Desde 49 €; 119 € para 250 invitados, IVA incluido | Competidor español con foto, voz y entrega al día siguiente |
| WedShoots / Bodas.net | Álbum y herramientas gratuitos | Marca conocida; fricción de app a contrastar |
| Álbum compartido y mensajería | A menudo sin compra adicional | Conformarse con lo conocido es un sustituto real |

Fuentes oficiales: [S3–S7, S18]. QR, galería e ideas fotográficas no bastan para afirmar exclusividad. Tampoco el español por sí solo. Lumen deberá demostrar facilidad, participación y entrega consistente; no competir añadiendo todas las funciones de otros.

**Techo ilustrativo:** 175.364 × 99 € = 17,36 M€ de cobros anuales si cada matrimonio comprase, hipótesis irreal. No es el mercado servible. Un rango exploratorio del 10–25 % serían 17.536–43.841 eventos, pero ese porcentaje no está medido y no debe presentarse como demanda estimada.

Para el primer año sirve más un cálculo desde el canal: **10 socios × 30 bodas/año × 40 % de adopción = 120 eventos**; más 120 ventas directas darían 240. Todos son supuestos. No contar dos veces una boda que llega desde pareja y masía. Empezar donde puedas conseguir presentaciones personales, sin asumir una región no confirmada ni desarrollar idiomas antes de vender.

<!-- PAGE -->
# 3 Cliente objetivo y modelos de ingresos

**Pareja:** quiere recuperar momentos de sus invitados y evitar pedir fotos durante semanas. **Masía/finca:** puede incluir el álbum como detalle o revenderlo, siempre que no añada incidencias. **Wedding planner:** busca reutilizar un servicio fácil de preparar. El invitado es usuario, no comprador inicial; pedirle tarjeta reduciría la participación que genera valor.

El fotógrafo puede ser colaborador posterior. Presentar Lumen como complemento, respetar permisos y evitar prometer que sustituye el reportaje profesional.

| Modelo | Ventaja | Riesgo | Decisión |
|---|---|---|---|
| Pago único B2C | Entendible y fácil de probar | Captación nueva por boda | Prioridad |
| Suscripción de parejas | Ingreso mientras está activa | Necesidad puntual y bajas | No como oferta principal |
| Eventos/créditos B2B | Repetición y distribución | Margen menor; dependencia | Probar en paralelo |
| Licencia anual profesional | Previsibilidad | Recurrencia sin demostrar | Posterior |
| Cobro por invitado | Escala con tamaño | Recuento discutible y fricción | Evitar al inicio |
| Tramos de capacidad | Acotan coste | Complican la compra | Si el consumo lo justifica |
| Comisión por recomendación | Poco compromiso del socio | Atribución/canibalización | Alternativa al pack |

**Oferta a validar:** reunir las fotos de invitados mediante QR y entregar un álbum completo sin perseguirlas después. La descarga completa es parte de la propuesta futura y debe existir antes de prometerla. Material imprimible, preparación sencilla y soporte claro pueden justificar precio, pero todavía son hipótesis de preferencia.

**Valor B2B:** si el recinto paga 49 € netos y revende a 99 € con IVA, ingresa 81,82 € netos y obtiene 32,82 € de margen bruto antes de cobro, venta y soporte propios. No afirmar que lo venderá. Medir aceptación de parejas y tiempo del coordinador. Si lo incluye gratis en su paquete, comprobar qué beneficio percibe.

Un modelo por asistente de 0,50–1 € podría compararse en entrevistas, pero necesitaría mínimo por boda y reglas de recuento. La cuota actual de diez fotos es local por navegador: **no representa diez fotos por persona ni una unidad facturable fiable**. Cobrar por evento y limitar capacidad técnica resulta más sencillo.

No construir un panel completo de masías por una conversación favorable. Primero conseguir un segundo evento pagado y registrar las tareas que se repiten. La recurrencia potencial pertenece al profesional; la pareja tiene una necesidad puntual.

<!-- PAGE -->
# 4 Oferta y precios que probar

**Paquete pareja: 99 € IVA incluido, pago único por boda.** Propuesta: QR, galería, dedicatorias, moderación, pase, kit imprimible y descarga completa. Configuración desde la compra; subida desde siete días antes hasta treinta después; consulta y descarga hasta doce meses después. Son condiciones propuestas, no capacidades certificadas hoy.

Limitar el piloto a una capacidad ensayada, por ejemplo 200 asistentes y 2.000 fotos optimizadas. No publicitar esas cifras hasta probarlas. Explicar calidad y conservación antes del pago. Evitar «ilimitado», cargos automáticos al superar cuota o pérdida silenciosa de pendientes. El límite de 1.000 filas del administrador debe resolverse o reducirse la capacidad de la oferta.

**Prueba de precio:** comenzar con 99 € a parejas con fecha y comprador identificado. Si rechazan, separar falta de utilidad, confianza y precio antes de probar 79 €. Si convierte sin descuentos y hay margen, contrastar 129 €. Usar cohortes comparables y registrar procedencia, oferta y rechazo; diez ventas no permiten declarar un precio óptimo con precisión estadística.

| Modalidad profesional | Precio propuesto | Condición |
|---|---|---|
| Primer evento | 59 € + IVA | Prueba pagada sin gran compromiso |
| Pack de 5 | 245 € + IVA | 49 € netos/evento, después de probar |
| Recomendación | 15 % del ingreso neto B2C | 12,27 € sobre 99 €; no acumulable al pack |
| Licencia anual futura | Ejemplo 990 € + IVA por 25 eventos | Solo con repetición y soporte acotado |

Créditos activables durante doce meses; cada boda activada mantiene su propio plazo de conservación. Definir cancelaciones, cambios de fecha y créditos no utilizados. Una licencia anual de 990 € solo resulta más barata que 49 €/evento a partir de 21 eventos; no imponerla a socios con poco uso. No contabilizar hoy estos packs como ingreso mensual recurrente validado.

En recomendación, Lumen cobra a la pareja y liquida la comisión tras devoluciones. En reventa, Lumen factura al profesional, que decide su precio y atiende la ayuda básica. Mantener permisos por boda: comprar créditos no debe dar acceso indiscriminado a fotos de parejas.

**Límites de servicio:** no incluye presencia durante el evento, personalizaciones a medida ni chat 24/7. Definir un horario real de soporte. Una ampliación de retención podría venderse posteriormente si hay demanda y costes medidos; no basar la viabilidad en suscripciones de almacenamiento ni conservación perpetua.

<!-- PAGE -->
# 5 Economía por boda

Simulación para decidir, no previsión. Se usa IVA general del 21 % en venta interior ordinaria y Stripe 1,5 % + 0,25 € para tarjetas estándar del EEE. Otros medios, tarjetas, facturación, localización e impuestos pueden variar. [S8–S9]

| Concepto por boda | Pareja directa | Profesional en pack |
|---|---|---|
| Ingreso sin IVA | 81,82 € | 49,00 € |
| Cobro con IVA | 99,00 € | 59,29 € equivalentes |
| Comisión de pago | 1,74 € | 0,94 € |
| Coste técnico variable supuesto | 4,00 € | 4,00 € |
| Soporte a 30 €/hora | 10,00 € / 20 min | 7,50 € / 15 min |
| Reserva del 3 % del ingreso neto | 2,45 € | 1,47 € |
| Contribución antes de captación | 63,63 € | 35,09 € |
| Captación imputada | 20,00 € | 8,00 € |
| Contribución después de captación | **43,63 €** | **27,09 €** |

**Fórmula:** ingreso neto − comisión de cobro − coste técnico variable − soporte − reserva − adquisición. IVA cobrado no es ingreso disponible. Reserva del 3 % es supuesto, no tasa observada ni tratamiento contable definitivo.

La comisión profesional se calcula sobre un solo pago del pack: (296,45 € × 1,5 % + 0,25 €) / 5. Se supone que se consumen los cinco créditos. Captación de 8 €/evento equivale, por ejemplo, a 120 € invertidos por socio que aporte quince bodas. Hasta medir repetición, ese reparto puede ser optimista.

| Precio B2C con IVA | Contribución con captación de 20 € | Captación máxima para conservar 25 € |
|---|---|---|
| 79 € | 27,90 € | 22,90 € |
| 99 € | 43,63 € | 38,63 € |
| 129 € | 67,23 € | 62,23 € |

El coste de adquisición o CAC incluye publicidad y tiempo comercial atribuible. Una hora adicional de ayuda resta 30 €: a 99 €, el margen directo bajaría a 13,63 € y el profesional sería negativo. Si el coste técnico sube de 4 a 12 €, restan otros 8 €. Controlar captación y asistencia pesa más que ahorrar céntimos de almacenamiento.

En recomendación, la comisión de 12,27 € sustituye al CAC publicitario cuando no hay otro coste de adquisición; no restar ambos automáticamente ni considerar gratis el canal. Objetivo inicial propuesto: contribución positiva y al menos 25 € por boda tras costes imputados.

<!-- PAGE -->
# 6 Escenarios y presupuesto

Doce meses de operación con bodas servidas. Mantienen costes unitarios anteriores y precio profesional de 49 € netos. No son ventas prometidas en noventa días ni incluyen suscripciones hipotéticas.

| Indicador | Validación | Base | Escala exigente |
|---|---|---|---|
| Bodas | 60 | 300 | 1.000 |
| Directas / profesionales | 30 / 30 | 120 / 180 | 350 / 650 |
| Ingreso sin IVA | 3.925 € | 18.638 € | 60.486 € |
| Contribución tras captación | 2.122 € | 10.112 € | 32.879 € |
| Fijos anuales supuestos | 1.800 € | 3.000 € | 4.800 € |
| Resultado del modelo | **322 €** | **7.112 €** | **28.079 €** |
| Horas de soporte imputadas | 17,5 | 85,0 | 279,2 |

Ya se descuenta soporte a 30 €/hora. No se remunera desarrollo, mantenimiento general, administración, contenido ni ventas fuera del CAC. Tampoco inversión inicial, cotizaciones o impuestos sobre beneficio. **No es sueldo neto ni caja libre.** Mil bodas exigen una operación organizada aunque no asistas a ninguna.

Con mezcla fija 40 % directa y 60 % profesional, la contribución media sería 33,71 €: unas **90 bodas cubren 3.000 € fijos**. Para dejar 30.000 € antes de los conceptos excluidos y cubrir 4.800 € fijos harían falta unas 1.033 bodas. Esta mezcla difiere del escenario de escala de la tabla.

**Techo inicial propuesto:** 1.500–3.000 € de caja y 80–140 horas propias, liberados por hitos. Asignar 600–1.000 € a revisión legal/fiscal, 200–500 € a herramientas del ensayo, 300–600 € a captación y 100–200 € a material/demos, reservando el resto. Son asignaciones, no presupuestos de proveedores.

Valorar las horas propias a 30 € añade 2.400–4.200 € de coste de oportunidad. Si resolver bloqueos supera el techo, reducir alcance del piloto o ampliar calendario. No añadir funciones para justificar inversión ya realizada.

**Caja y estacionalidad:** separar venta, celebración y conservación. Anticipos y packs financian servicios futuros; reservar IVA, devoluciones y entrega. Registrar créditos pendientes y bodas próximas. Preparar la temporada siguiente durante periodos de menos eventos y limitar bodas simultáneas según capacidad ensayada.

Antes de escalar, sustituir cada supuesto por una medida: facturas, bytes, tráfico, minutos de soporte, gasto comercial y bodas repetidas por socio. El escenario base es una hipótesis de gestión, no una valoración de Lumen ni una garantía de rentabilidad.

<!-- PAGE -->
# 7 Validación comercial en 90 días

Periodo orientativo: 28/09–27/12/2026. Reservas para 2027 prueban compra, pero no autonomía durante la boda. Si faltan cinco eventos próximos, mantener lanzamiento limitado hasta observarlos; no sustituir uso real por previsiones.

| Periodo | Trabajo | Evidencia |
|---|---|---|
| Días 1–14 | Reconstruir 2 casos; 12 entrevistas a parejas y 8 a profesionales; oferta/demo | Alternativa actual, problema, decisor y objeciones |
| Días 15–30 | Cerrar bloqueos piloto; presentar precio a 20 parejas y 10 profesionales cualificados | Pagos o reservas con importe y condiciones |
| Días 31–60 | Servir 3–5 bodas; probar configuración y entrega; ofrecer segundo evento | Participación, soporte, fallos y repetición |
| Días 61–90 | Alcanzar 10 ventas; concentrar canal ganador; automatizar tareas repetidas | Margen, 3 socios compradores y eventos autónomos |

Oportunidad cualificada: fecha aproximada, encaje con capacidad, decisor y posibilidad real de contratar. Contar todas las ofertas, incluidos rechazos. Buscar compras fuera del círculo familiar; los descuentos a conocidos no validan el precio completo.

**Continuar:** diez compras/reservas reales registradas, tres colaboradores compradores y, como evidencia B2B más fuerte, dos que vuelvan a pagar tras su primer evento. Separar reservas de bodas celebradas y medir cancelaciones.

**Abrir autoservicio:** cinco bodas consecutivas sin intervención rutinaria durante la celebración, álbum entregado y controles críticos superados. Objetivos propuestos: configuración inferior a quince minutos, soporte mediano inferior a veinte minutos por boda con tendencia a diez. Revisar percentil 90, no solo media.

**Cambiar oferta/canal:** menos de tres compras tras veinte ofertas cualificadas es señal para investigar y probar un cambio. No prueba estadística de que no haya mercado. Si una segunda cohorte comparable sigue sin tracción, frenar funciones y replantear segmento.

**Frenar escala:** cualquier fuga entre eventos, pérdida no recuperada o margen negativo persistente requiere corrección. Si tras cinco bodas la ayuda supera 45 minutos por evento, mejorar el flujo antes de aumentar adquisición.

Regla contra el desarrollo indefinido: construir una función si resuelve riesgo crítico, coste repetido medido o bloqueo de compra concreto. Como umbral de disciplina, tres compradores independientes que la exijan o dos socios que se comprometan a pagar por ella. Una petición o una encuesta favorable no bastan.

<!-- PAGE -->
# 8 Primeras ventas y entrevistas

**Canal directo:** convertir los dos eventos en casos con permiso. Enseñar una demo de dos minutos con imágenes autorizadas o de prueba, precio, calidad y entrega final. Empezar por recomendaciones de organizadores y profesionales; crear contenido sobre búsquedas concretas, midiendo compras y no solo visitas.

Publicidad solo después de que la oferta convierta contactos reales. Ensayo de 300 € con límite de CAC; si no hay compras, revisar mensaje, confianza y utilidad antes de ampliar producto. No financiar crecimiento con margen imaginado.

**Canal profesional:** lista de veinte espacios/planners de una zona accesible y un coordinador identificable. Mostrar cuánto tarda preparar una boda y proponer primer evento pagado. Un embudo de trabajo podría ser 20 contactos, 8 conversaciones, 3 pruebas y 2 repeticiones: todos supuestos a reemplazar por resultados. Incluir visitas y demos en el coste comercial.

### Preguntas que aportan evidencia
1. ¿Cómo habéis reunido o pensáis reunir las fotos de invitados y quién lo gestiona?
2. ¿Qué fotos faltaron y cuánto tiempo costó conseguirlas?
3. ¿Qué alternativa elegisteis y cuánto pagasteis?
4. Tras ver la demo y sus límites, ¿contrataríais este paquete para esa fecha a este precio?
5. Si no, ¿qué impide comprar: necesidad, confianza, calidad, precio o requisito concreto?

A profesionales, añadir bodas anuales reales, porcentaje al que lo ofrecerían, persona responsable, margen necesario y tareas que no aceptan. Pedir una prueba pagada en fecha concreta aporta más evidencia que «me interesa».

**Registro mínimo:** origen, segmento, fecha, precio ofrecido, decisión, motivo de pérdida, cobro, coste comercial y próximo paso. Una hoja o tabla basta al principio; no montar un CRM complejo.

### Cómo lograr participación sin estar presente
El anfitrión recibe QR listo para imprimir, instrucciones breves, enlace de prueba y texto para anunciarlo. Una persona de la pareja o del recinto coloca el material, explica el álbum y modera. El fundador no debe convertirse en animador ni técnico presencial.

Probar si el QR se ve, si se entiende el beneficio y si los invitados pueden aportar desde mensajería. No asumir que dejar tarjetas sobre la mesa garantiza participación. Medir dispositivos contribuyentes y fotos útiles; entrevistar a quienes no participaron.

El material comercial debe presentar Lumen como complemento de los recuerdos profesionales. No reutilizar fotografías para promoción sin permiso específico ni ofrecer beneficios ambientales cuantificados que no se hayan medido.

<!-- PAGE -->
# 9 Requisitos antes del piloto pagado

El piloto puede tener alta y facturación manuales, acotadas y registradas. Privacidad, permisos, recuperación y entrega deben estar resueltos. No hace falta completar un portal de masías para vender diez bodas.

| Requisito P0 | Evidencia mínima de aceptación |
|---|---|
| Archivos privados y permisos | Lectura entre eventos denegada; borrado solo por propietario o administrador autorizado, incluso fuera de la interfaz |
| Condiciones veraces | Contacto, finalidades, plazos, precio, calidad, cancelación y retirada claros |
| Entrega y recuperación | Descargar todas las fotos, verificar recuentos y restaurar una copia |
| Subida fiable | iPhone/Android reales, red interrumpida y reintento sin duplicados |
| Control de capacidad | Tamaños y cuotas aplicados en servidor; aviso antes del límite |
| Moderación delegada | Organizador accede, recupera acceso y retira contenido |
| Alertas verificadas | Fallo de prueba genera aviso útil y existe procedimiento |
| Operación comercial | Dominio/correo, cobro, factura y hosting apto para uso comercial |

**Hallazgos prioritarios del código:** la migración 017 mantiene bucket público y el servicio genera URL pública. El onboarding afirma no recoger datos identificables aunque recibe fotografías. Persisten datos de una boda concreta en pantallas. Estos cambios van antes que más juegos. [I2–I4]

La administración consulta como máximo 1.000 fotos y descarga individualmente. Antes de vender 2.000 fotos, resolver consulta/exportación o reducir la oferta a una capacidad validada. El informe del 15/09 documentaba inconsistencias entre objetos y filas: es antecedente, no medición actual, y justifica conciliación y restauración ensayadas. [I1, I4]

**Las copias de base de datos de Supabase no incluyen los archivos de Storage.** Respaldar ambos y probar restauración conjunta. Un export descargable tampoco sustituye por sí solo un respaldo operativo. [S12]

Desarrollo verifica permisos y recuperación; QA prueba escenarios separados con imágenes sintéticas; asesoría revisa datos y contratación; fundador fija capacidad y decide abrir el piloto. No ejecutar pruebas destructivas sobre fotografías reales.

No prometer SLA, cero pérdida, privacidad certificada o cumplimiento integral por tener RLS y tests. Verificar el despliegue concreto, acceso directo a archivos, sesión perdida, cierre, cuota, carga y exportación completa. La aceptación debe basarse en resultados reproducibles.

<!-- PAGE -->
# 10 Operación autónoma de principio a fin

La autonomía elimina tareas repetidas y hace atendibles las excepciones. La administración ya existe: el organizador debe manejarla con permisos limitados e instrucciones claras.

| Momento | Automatización | Excepción prevista |
|---|---|---|
| Compra | Cobro, confirmación y factura | Fallo o devolución |
| Alta | Crear evento y propietario una vez | Cobro sin evento |
| Preparación | Editor, QR, kit y prueba guiada | Fecha/correo incorrectos |
| Antes | Recordatorios y comprobación | Boda sin preparar |
| Durante | Apertura programada, cola y moderación | Red, contenido o límite |
| Después | Cerrar subidas y conservar consulta | Cambio de fecha o pendientes |
| Entrega | Export completo y aviso | Archivo incompleto o enlace vencido |
| Retención | Avisos y borrado al vencer | Derechos o ampliación consentida |

Validar el pago con notificación del proveedor, no desde la pantalla de éxito. Repetir una notificación no debe crear dos bodas. Registrar compra, creación y correos; reconciliar cobros y trabajos fallidos. Un reembolso sigue condiciones claras y no dispara pérdida irreversible por error transitorio.

Estados propuestos: borrador, listo, subidas abiertas, álbum consultable, export listo, vencido y borrado. El código actual liga parte de la lectura a apertura; **cerrar subidas no debe ocultar el álbum contratado**. Fechas en zona horaria del evento y prueba de cambio de hora. [I3]

Una bandeja de excepciones muestra bodas próximas sin preparar, pagos inconsistentes, subidas anómalas, exportaciones fallidas y consumo. Cada incidencia tiene responsable, acción y comprobación de cierre. Alertar al fundador por fallos accionables, no por cada reintento recuperado.

Ayuda contextual sobre cámara, navegador integrado, red y pendientes. Un organizador puede cerrar/moderar sin asistencia técnica. Cero intervención durante una boda no significa cero soporte anual: hay que mantener atención de excepciones, privacidad, copias y despliegues.

Definir horario real. Si el mercado exige respuesta inmediata los fines de semana, cobrar por esa cobertura o contratarla cuando el volumen lo permita. No venderla implícitamente dentro de un paquete barato. El objetivo es que ninguna celebración necesite tu presencia para funcionar.

<!-- PAGE -->
# 11 Herramientas y control de costes

Conservar Angular, Supabase y Vercel mientras cumplan el servicio. No se necesita migración ni una colección de herramientas: cada incorporación debe eliminar trabajo manual concreto.

| Función | Solución inicial | Comprobación |
|---|---|---|
| Cobros | Stripe Checkout / Payment Links | Pago verificado y conciliación |
| Datos y permisos | Supabase Auth, Postgres, Storage privado | Accesos, región, copias y consumo |
| Hosting | Vercel en plan comercial | Hobby es personal/no comercial |
| Correo | Un proveedor transaccional | Dominio autenticado, reintento y rebotes |
| Tareas | Planificador y cola persistente | Cierre, export, avisos y borrado idempotentes |
| Errores | Logs/Telegram ya implementados | Despliegue real y aviso de prueba |
| Soporte | Correo, ayuda y registro | Trazabilidad y horario |
| Ventas y métricas | Tabla y colector de eventos | Sin fotos ni tokens en analítica |
| Facturación | Proveedor/gestoría | Requisitos aplicables; no confundir recibo y factura |

Precios de referencia consultados: Supabase Pro desde **25 USD/mes**, Vercel Pro desde **20 USD/mes**. No son coste total. El fijo base de 250 €/mes deja espacio para correo, copias, dominio, gestión y monitorización; reemplazarlo por facturas. No sumar esos fijos otra vez a los 4 € variables por boda. [S10–S13]

**Ejemplo técnico, no consumo medido:** 150 asistentes × 40 % contribuyentes × 8 fotos × 0,7 MB ≈ 336 MB almacenados. Si cien visitantes cargan cien fotos de ese tamaño, se descargan unos 7 GB. Miniaturas, caché y paginación importan; el vídeo cambiaría mucho la economía.

Medir bytes, tráfico, exportaciones y meses conservados por boda. Los 4 € deben cubrir el ciclo completo contratado y su copia, no solo el día del evento. Ajustar oferta si el uso real supera el presupuesto.

Alertas propuestas: 50/80/100 % del presupuesto, pagos sin evento, export no completado y fallos de subida sostenidos con volumen mínimo. Una comprobación externa de disponibilidad debe detectar también una caída del canal de logs. No sustituir verificación por instalar otra herramienta.

No comprar un chatbot ni una plataforma de automatización compleja al inicio. Primero textos claros, autoservicio, trazabilidad y procedimientos; después automatizar las excepciones repetidas que consuman tiempo.

<!-- PAGE -->
# 12 Privacidad y contratación

Las imágenes identificables son datos personales; un QR no elimina esa condición. Informar quién trata datos, para qué, quién ve fotos, cuánto se guardan y cómo ejercer derechos. La AEPD distingue información y consentimiento: una casilla genérica no resuelve todas las bases jurídicas. [S14–S15]

**Roles y contratos:** analizar con asesoría las responsabilidades de Lumen, pareja y profesional según modalidad. Cuentas, cobro y analítica pueden generar responsabilidades propias; fotos requieren análisis separado y contrato de encargado cuando proceda. Una celebración privada no exime automáticamente al proveedor comercial. Revisar subencargados, localización y transferencias.

**Acceso y retirada:** archivos autorizados, álbum sin indexación pública y enlaces revocables. La clave del QR puede reenviarse: explicarlo y permitir rotación. Quien sube una foto no consiente por todas las personas retratadas. Establecer canal de retirada y tratamiento de imágenes de menores; no reutilizar para marketing sin autorización separada.

**Conservación:** publicar subida, consulta y borrado. Avisar antes del vencimiento, facilitar descarga y eliminar derivados/exportaciones según política, contemplando el ciclo de copias. Separar documentos que deban conservarse por obligación legal. No prometer recuerdos perpetuos con un pago pequeño.

**Contratación:** identificación/contacto, precio B2C con impuestos, prestaciones, calidad, cancelaciones, cambios de fecha y derechos. No asumir que todo servicio digital pierde automáticamente desistimiento: revisar clasificación y requisitos. Confirmar alta y facturación antes de cobrar. [S9, S16–S17]

**Medición y comunicaciones:** recopilar lo mínimo, revisar base jurídica de analítica y cookies no necesarias, separar correos del servicio y marketing. No enviar promociones a invitados solo por participar. Mantener derechos, eliminación y respuesta ante incidentes documentados.

### Pruebas de fiabilidad
Entorno separado con dos eventos y distintos roles; comprobar acceso directo, borrado, sesión perdida, cierre, límite, red interrumpida y restauración. Ensayar Safari/iPhone y Chrome/Android, enlaces desde mensajería, álbum grande y recuento completo de exportación.

Publicación confirmada solo con objeto y registro guardados; reintento sin duplicado; pendiente recuperable y fallo explicado. Definir objetivos de recuperación y pérdida tolerable tras pruebas. Un test unitario no acredita carga real ni operación de fin de semana.

<!-- PAGE -->
# 13 Métricas y hoja de trabajo

Métrica principal: **bodas pagadas que reciben un álbum útil sin intervención rutinaria del fundador**. Muchas visitas no bastan si no hay recuerdos o cada evento exige horas de ayuda.

| Métrica | Definición y decisión |
|---|---|
| Conversión | Compras/ofertas cualificadas; separar de compras/visitas web |
| Activación | Datos, QR probado y organizador listo antes de la boda |
| Participación | Dispositivos contribuyentes/asistentes estimados; aproximación |
| Entrega | Exportaciones completas/eventos terminados |
| Autonomía | Eventos sin intervención rutinaria durante celebración |
| Soporte | Minutos por boda, mediana y percentil 90 |
| Contribución | Ingreso neto menos costes atribuibles por canal |
| Repetición | Segunda compra/socios con oportunidad de repetir |

Registrar compra, creación, configuración, QR probado, primera foto, fallo/recuperación, export listo/descargado y soporte. Los eventos del navegador necesitan colector persistente; no asumir almacenamiento por existir AnalyticsService. [I5]

**Bloque A, 30–50 horas orientativas:** verificar despliegue, archivos privados, permisos, textos, exportación y copia/restauración. Alta manual trazable aceptable durante piloto.

**Bloque B, 25–45 horas:** configuración genérica, cobro/alta idempotente, acceso recuperable del anfitrión y kit QR. Una compra completa antes de multiplicar planes.

**Bloque C, 25–45 horas:** estados programados, entrega, retención, métricas y excepciones. Ajustar a eventos observados; no completar todo antes de hablar con compradores. Rangos no son compromisos de entrega.

Handoff: sesión/permisos y migraciones 012/017/019 para privacidad; onboarding/home/EventService para datos genéricos; admin/Storage para export íntegro; PhotoLimitService para control servidor; AdminAccessService para anfitrión; Logger/API/AnalyticsService para operación. Evidencias concretas en anexo.

**Después de demanda:** carga múltiple, mejores recordatorios, plantillas y panel de créditos. **Esperar a compras que lo justifiquen:** vídeo, RSVP, mesas, juegos, IA, álbum físico y marca blanca completa.

Revisión semanal de ventas, pérdidas, margen, soporte y bodas próximas. Elegir un cuello de botella: si no compran, oferta/canal; si no participan, activación; si cuesta operarlo, automatización. La meta inmediata es vender el núcleo y entregar sin depender de que estés conectado.

<!-- PAGE -->
# 14 Fuentes públicas

Consulta de mercado y precios el 28/09/2026. Fuentes de competidores describen sus ofertas, no ventas demostradas. Precios Lumen, costes, conversiones y umbrales son supuestos del plan.

**S1 · INE.** Resultados definitivos 2024, publicación 19/11/2025: 175.364 matrimonios. [Estadística oficial](https://www.ine.es/dyngs/Prensa/MNP2024.htm).

**S2 · Bodas.net.** Artículo actualizado 04/06/2026 e informe 2026 sobre parejas casadas en 2025. [Coste de una boda](https://www.bodas.net/articulos/cuanto-cuesta-casarse--c841).

**S3 · Wedibox.** Importes en USD, impuestos no especificados. [Planes](https://www.wedibox.com/pricing) y [programa profesional](https://www.wedibox.com/resources/partner-program).

**S4 · Guestpix.** Consulta de precios en EUR. [Planes para bodas](https://guestpix.com/weddings-pricing/?currency=EUR).

**S5 · WedUploader.** Oferta Premium y Google Drive. [Precios](https://weduploader.com/pricing).

**S6 · WedShoots.** Álbum de boda gratuito. [Web oficial](https://www.wedshoots.com/).

**S7 · Bodas.net.** Herramientas para parejas. [Web oficial](https://www.bodas.net/).

**S8 · Stripe.** 1,5 % + 0,25 € para tarjetas estándar EEE. [Tarifas España](https://stripe.com/es/pricing).

**S9 · AEAT.** Tipo general IVA 21 %. [Tipos impositivos](https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/tipos-impositivos-iva.html).

**S10 · Supabase.** Pro desde 25 USD/mes y cuotas. [Precios](https://supabase.com/pricing).

**S11 · Vercel.** Pro desde 20 USD/mes. [Precios](https://vercel.com/pricing).

**S12 · Supabase.** Backups de base no incluyen objetos Storage. [Documentación](https://supabase.com/docs/guides/platform/backups).

**S13 · Vercel.** Restricción personal/no comercial de Hobby. [Condiciones del plan](https://vercel.com/docs/plans/hobby).

**S14 · AEPD.** Información y consentimiento. [Cláusula de privacidad](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion/FAQ-0248-sobre-si-el-usuario-tiene-que-dar-consentimiento-a-clausula-de-privacidad).

**S15 · AEPD.** Imágenes identificables como datos; principio general, no dictamen sobre Lumen. [Resolución E/11417/2019](https://www.aepd.es/documento/e-11417-2019.pdf).

**S16 · BOE.** Contratación a distancia y desistimiento. [RDL 1/2007 consolidado](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555).

**S17 · BOE.** Información y contratación electrónica. [Ley 34/2002](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758).

**S18 · ParaSiempre.** Desde 49 € y plan 250 invitados a 119 € IVA incluido. [Oferta oficial](https://parasiempre.app/).

<!-- PAGE -->
# 15 Evidencia del proyecto y límites

Rutas relativas al proyecto Lumen. Revisión estática del árbol de trabajo del 28/09/2026. Los hallazgos remotos del informe interno corresponden a su fecha; no son una nueva comprobación de producción.

**I1 · Informe técnico interno.** docs/INFORME_TECNICO.md:11–15, 192, 420–443 y 523–525. Configuración histórica, límites de las pruebas, consistencia y dependencias de observabilidad. Sus agregados no se usan como métricas comerciales actuales.

**I2 · Fotos y experiencia.** web/src/app/features/camera/camera.ts:597, compresión; web/src/app/features/home/home.html:238, selección individual; home.ts:85, ideas; web/src/app/features/memories/memories.ts:22, pase; web/src/app/core/services/upload-queue.service.ts:38, cola.

**I3 · Acceso y estados.** web/scripts/migrations/017_harden_storage_and_enable_realtime.sql:9, bucket público; 019_event_launch_and_admin.sql:74, lectura ligada a apertura; web/src/app/core/services/session.service.ts:151, pertenencia; photo-limit.service.ts:49, cuota local.

**I4 · Administración y configuración.** web/src/app/core/services/admin-access.service.ts:13; web/src/app/features/admin/admin.ts:107 y :161, consulta limitada y descarga individual; web/src/app/features/onboarding/onboarding.html:16 y :49, datos fijos y texto de privacidad.

**I5 · Operación.** web/src/app/core/services/analytics.service.ts:28; logger.service.ts:11; web/server/log-ingestion.ts:195; web/docs/mobile-launch.md:22. Existencia de código no acredita entrega real de métricas o avisos.

**I6 · Presentación aportada.** «Copia de Dark Blue and White Minimalist Simple Thesis Defense Presentation», 28 diapositivas. Casos de uso, pruebas, encuesta y trabajo futuro se trataron como contexto histórico, no como instrucciones ni prueba de demanda pagada. El código ha superado algunos trabajos futuros descritos.

### Datos que deben sustituir hipótesis
Coste mensual real, tamaño y tráfico por boda, horas dedicadas a los dos eventos, pagos y descuentos, participación, causas de rechazo, bodas repetidas por socio y objetivo de ingresos del fundador. Recogerlos evita refinar el producto sin una decisión comercial detrás.

**Confianza:** alta en las funcionalidades y carencias localizadas en el código; moderada en su implicación operativa, pendiente del despliegue; baja en precio óptimo, conversión y volumen, porque aún requieren compras observadas. El modelo es estructural y comprobable, no una previsión validada.

**Decisión propuesta al cerrar el plan:** abrir una validación comercial acotada, cerrar los bloqueos de privacidad y entrega antes de servir pilotos pagados, y ampliar automatización conforme las compras y eventos confirmen necesidad. Las funciones de planificación pueden esperar.
