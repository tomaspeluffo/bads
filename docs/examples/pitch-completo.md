# Pitch Completo — Portal de Turnos Online para Clinica Dental

## Datos para el formulario

- **Titulo:** Portal de Turnos Online para Clinica Dental
- **Repositorio:** blumb-agency/clinica-dental-turnos
- **Branch base:** main

---

## Problema

La Clinica Dental Sonrisa Perfecta gestiona sus turnos por telefono y WhatsApp. La recepcionista tiene una planilla Excel con los horarios de 4 dentistas. Los problemas actuales son:

1. Se pierden turnos porque los mensajes de WhatsApp quedan sin leer fuera de horario
2. Hay doble reserva frecuente porque la planilla no se actualiza en tiempo real
3. Los pacientes no reciben recordatorios y hay un 30% de ausentismo
4. No tienen forma de que los pacientes cancelen o reprogramen por su cuenta
5. El proceso manual consume ~3 horas diarias de la recepcionista

Actualmente tienen una web institucional estatica hecha en WordPress que solo muestra info de contacto.

---

## Solucion propuesta

Desarrollar un portal web en el subdominio turnos.sonrisaperfecta.com.ar (aplicacion independiente, NO iframe). En el WordPress existente se agrega un boton "Reservar turno" que redirige al subdominio. No se requiere consistencia visual con el theme de WordPress — el portal tiene su propio diseno limpio y moderno con los colores de la marca (azul #1E40AF y blanco).

### Portal del paciente (mobile-first, responsive):

1. Ver disponibilidad en tiempo real de cada profesional
2. Reservar turnos seleccionando profesional, tipo de consulta y horario
3. Recibir confirmacion por email
4. Cancelar o reprogramar turnos desde un link en el email (con token unico, sin login)
5. Recibir recordatorio automatico 24h antes del turno

**Los pacientes NO crean cuenta.** Reservan como invitados completando: nombre completo, email, telefono y obra social. Se identifica univocamente al paciente por email. Si el mismo email reserva de nuevo, se asocia al mismo registro de paciente (match por email, sin duplicados). Los datos del paciente persisten entre turnos para mostrar historial en el panel admin.

### Panel de administracion (desktop):

1. Dashboard con turnos del dia, semana y mes (vista calendario)
2. Gestion de profesionales (horarios, dias de atencion, vacaciones)
3. Bloqueo de horarios (feriados, reuniones, etc.)
4. Listado de pacientes con historial de turnos
5. Configuracion de tipos de consulta (duracion, precio)

**Los turnos se confirman automaticamente** al reservar online. No requieren aprobacion manual del admin. Si un paciente no se presenta, el admin marca manualmente "ausente" desde el dashboard — NO se libera el slot automaticamente. El admin puede ver la cantidad de ausencias por paciente.

**No se necesitan notificaciones en tiempo real** en el panel admin. Alcanza con que el dashboard se actualice al refrescar o con polling cada 30 segundos. Solo hay 2 admins (la recepcionista y el dueño de la clinica), no van a trabajar simultaneamente sobre el mismo turno.

### Flujo del paciente:
1. Entra al portal → selecciona profesional (o "cualquiera") → selecciona tipo de consulta → ve calendario con slots disponibles → selecciona horario → completa datos (nombre, email, telefono, obra social) → confirma → recibe email de confirmacion con link para cancelar/reprogramar

### Flujo del admin:
1. Login → Dashboard → ve turnos del dia → puede confirmar asistencia, marcar ausencia, cancelar turno → gestionar profesionales y horarios

### Modelo de datos principal:
- **professionals**: id, nombre, especialidad, activo
- **schedules**: id, professional_id, dia_semana (0-6), hora_inicio, hora_fin (cada profesional puede tener horarios diferentes por dia, NO hay horarios rotativos ni por semana — siempre es la misma grilla semanal)
- **schedule_exceptions**: id, professional_id, fecha, motivo (vacaciones, feriado, etc.) — bloquea el dia completo
- **consultation_types**: id, nombre, duracion_minutos, precio
- **patients**: id, nombre, email (unique), telefono, obra_social, created_at
- **appointments**: id, professional_id, patient_id, consultation_type_id, fecha, hora_inicio, hora_fin, status (confirmed/cancelled/completed/no_show), cancel_token, created_at
- **users**: id, email, password_hash, role (admin) — solo para el panel admin

### Concurrencia:
Para evitar doble reserva, al confirmar un turno se usa una constraint UNIQUE en (professional_id, fecha, hora_inicio) + transaccion con SELECT FOR UPDATE antes de insertar.

---

## Definicion de exito / KPIs

- Reducir el ausentismo del 30% actual al 15% o menos (gracias a los recordatorios por email 24h antes)
- Que el 60% de los turnos nuevos se saquen online en el primer mes de uso
- Reducir el tiempo diario de gestion de turnos de 3 horas a menos de 30 minutos
- Cero dobles reservas (garantizado por constraint en DB)
- Tiempo de carga del portal del paciente < 2 segundos
- Tasa de entrega de emails > 95% (configurando SPF/DKIM correctamente)

---

## Stack tecnologico

- Frontend: React 18 + TypeScript + TailwindCSS + shadcn/ui
- Backend: Node.js + Express + TypeScript
- Base de datos: PostgreSQL (una sola DB para todo)
- Email: Resend (API para emails transaccionales — confirmacion, recordatorio, cancelacion)
- Cron job: node-cron en el mismo proceso del backend (para enviar recordatorios 24h antes)
- Deploy: Vercel (frontend) + Railway (backend + DB)
- Auth: JWT para el panel admin (no se necesita auth para pacientes, usan token unico en el link del email)
- Validacion: Zod para schemas de input
- Fechas: date-fns para manipulacion de fechas y slots

---

## No-gos (uno por linea)

No integrar con sistemas de historia clinica
No procesar pagos online
No implementar chat en vivo
No hacer app mobile nativa
No migrar ni modificar el WordPress existente (solo agregar un boton que redirige)
No implementar WebSockets ni notificaciones push
No hacer sistema de usuarios para pacientes (reservan como invitados)
No implementar horarios rotativos ni por semana (grilla semanal fija por profesional)

---

## Riesgos (uno por linea)

Los emails de recordatorio pueden caer en spam si no se configura bien el dominio (SPF/DKIM). Mitigacion: configurar registros DNS antes del deploy, usar Resend que maneja esto bien.
La clinica no tiene alguien tecnico para mantener el sistema post-deploy. Mitigacion: hacer la UX del admin extremadamente simple, documentar con guia de uso.
El horario de los dentistas cambia frecuentemente y la UX de gestion debe ser muy simple. Mitigacion: UI de drag & drop o formulario simple para cambiar horarios.
Race condition en reservas simultaneas. Mitigacion: UNIQUE constraint + SELECT FOR UPDATE en transaccion.

---

## Responsable

Pol Alvarez (Tech Lead Blumb)

---

## Soporte

Camila Aguado (Account Manager) — contacto con la clinica

---

## Notas adicionales

- Presupuesto aprobado: USD 3.500
- Timeline: 4 semanas
- La clinica tiene 4 dentistas y atiende lunes a viernes de 8 a 20h, y sabados de 9 a 14h
- Cada consulta dura entre 30 y 60 minutos dependiendo del tipo
- Tipos de consulta: Limpieza (30min), Revision general (30min), Ortodoncia (60min), Extraccion (45min), Blanqueamiento (60min), Urgencia (30min)
- La clinica ya tiene dominio propio: sonrisaperfecta.com.ar
- Quieren que el portal este en turnos.sonrisaperfecta.com.ar
- El cliente tiene acceso al DNS del dominio (Cloudflare) para crear el subdominio y configurar SPF/DKIM
- Los 4 dentistas actuales: Dra. Martinez (lun-vie 8-14), Dr. Lopez (lun-vie 14-20), Dra. Gomez (lun-mie-vie 8-14, sab 9-14), Dr. Fernandez (mar-jue 14-20, sab 9-14)
