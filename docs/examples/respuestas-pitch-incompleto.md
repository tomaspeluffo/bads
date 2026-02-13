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

---

*Nota: Con estas respuestas el planner deberia tener suficiente info para armar el plan. Acordate de configurar el repo (blumb-agency/shopify-dashboard) desde la pagina de detalle de la iniciativa.*
