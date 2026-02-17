# Respuestas a las preguntas del planner — Dashboard de Metricas E-commerce

Estas son las respuestas para pegar en el campo de texto cuando el planner pida mas info.

---

## Respuestas

**Metricas especificas:**
Las metricas que necesitan ver son:
- Ventas totales (diarias, semanales, mensuales)
- Cantidad de ordenes
- Ticket promedio
- Productos mas vendidos (top 10)
- Tasa de conversion (visitas vs compras) — esto viene de Google Analytics
- Ingresos por canal de trafico (organico, pago, directo, social)
- Stock bajo (productos con menos de 5 unidades)
- Comparativa mes actual vs mes anterior

**Stack tecnologico:**
React + TypeScript + TailwindCSS para el frontend. Node.js + Express para el backend. PostgreSQL para cachear los datos (no queremos pegarte a la API de Shopify en cada request). Usar Recharts para los graficos.

**Arquitectura y deploy:**
Es una SPA con un backend API. El backend hace sync periodico con Shopify (cada 15 minutos via cron job) y guarda los datos en la DB local. El frontend consulta el backend, nunca a Shopify directo. Deploy en Vercel (front) y Railway (back + DB).

**Autenticacion:**
Solo lo va a usar el dueno de la tienda y su socio. Login simple con email + password, maximo 3 usuarios. No necesitamos roles ni permisos granulares.

**Integracion con Google Analytics:**
Vamos a usar la Google Analytics Data API (GA4). El cliente ya tiene la propiedad de GA4 configurada. Necesitamos un service account para acceder. Las metricas que sacamos de GA son: sesiones, tasa de conversion, y trafico por canal. El resto sale todo de Shopify.

**Definicion de exito:**
- Que el cliente deje de usar planillas manuales para ver metricas
- Que el dashboard cargue en menos de 3 segundos
- Que los datos tengan un delay maximo de 15 minutos vs lo real de Shopify

**Credenciales y accesos:**
El cliente ya nos dio acceso de API a su tienda Shopify (tenemos el access token). El service account de Google Analytics lo creamos nosotros. Vamos a guardar todo en variables de entorno.

**Repositorio GitHub:**
blumb-agency/shopify-dashboard

**UI/UX y diseño del dashboard:**
No hay mockups ni wireframes. El dashboard es una sola pagina principal con cards de metricas arriba (KPIs) y graficos abajo. Inspiracion: el dashboard de Shopify Analytics pero simplificado. No necesita filtros de fecha avanzados, solo selector de periodo (hoy, esta semana, este mes, ultimo mes). No necesita exportacion a PDF ni Excel por ahora. Es solo desktop, no necesita ser mobile.

**Datos historicos:**
Solo necesitamos los ultimos 3 meses de datos historicos en la carga inicial. Despues el sync cada 15 minutos mantiene todo actualizado. No necesitamos particionamiento ni nada complejo, con indices en las columnas de fecha alcanza.

**Stock bajo:**
Solo trackear inventario actual, no historico de movimientos. Es solo visualizacion, no hay acciones desde el dashboard (no marcar para reposicion ni nada). Simplemente mostrar la lista de productos con stock menor a 5 unidades.

**Actualizacion en tiempo real:**
No necesitamos tiempo real ni websockets. El sync cada 15 minutos es suficiente. El usuario puede hacer refresh manual si quiere datos mas frescos. No necesitamos alertas ni notificaciones por ahora.

**Tasa de conversion (GA4 vs Shopify):**
Usamos GA4 como fuente para sesiones y Shopify como fuente para ordenes completadas. La formula es: ordenes de Shopify / sesiones de GA4. No hay reconciliacion compleja, mostramos cada metrica de su fuente original. Si hay discrepancias menores entre GA4 y Shopify es aceptable.

**API de Shopify:**
Usar la REST Admin API de Shopify (version estable mas reciente, 2024-01 o superior). Los endpoints que necesitamos son: orders, products, inventory levels. No usar GraphQL, el cliente tiene un plan Basic que tiene mejores rate limits en REST.

**Performance (KPI de 3 segundos):**
Los 3 segundos son para la carga inicial del dashboard una vez logueado (primera vista). Como los datos ya estan en PostgreSQL (no pegamos a Shopify en cada request), con buen indexado y queries simples deberia ser rapido. La medicion es desde Argentina, pero con Vercel CDN para el frontend no deberia ser problema.

**Repositorio y CI/CD:**
El repo blumb-agency/shopify-dashboard no existe todavia, hay que crearlo desde cero. No hay CI/CD preexistente. Hacer deploy manual al principio, despues se puede configurar auto-deploy en Vercel y Railway.

**Cron job de sincronizacion:**
Usar node-cron dentro de la misma app Express. Es una app chica, no justifica un servicio separado. El cron corre en un thread separado y no bloquea las requests HTTP. Si en el futuro escala, se puede mover a Railway Cron Jobs.

---

*Nota: Con estas respuestas el planner deberia tener suficiente info para armar el plan sin hacer mas preguntas. Acordate de configurar el repo (blumb-agency/shopify-dashboard) desde la pagina de detalle de la iniciativa.*
