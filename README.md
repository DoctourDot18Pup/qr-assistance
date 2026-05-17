# Sistema de Control de Asistencia Academica — QR Assistance

Sistema web monorepo construido con Next.js 15 que permite a instituciones educativas gestionar la asistencia mediante codigos QR, con soporte de justificantes, alertas automaticas y reportes descargables.

---

## Indice

- [Descripcion general](#descripcion-general)
- [Stack tecnologico](#stack-tecnologico)
- [Requisitos previos](#requisitos-previos)
- [Instalacion y configuracion](#instalacion-y-configuracion)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Autenticacion](#autenticacion)
- [Roles y permisos](#roles-y-permisos)
- [API referencia de endpoints](#api-referencia-de-endpoints)
- [Logica de alertas](#logica-de-alertas)
- [Reportes](#reportes)
- [Pruebas con Postman](#pruebas-con-postman)
- [Despliegue en Vercel](#despliegue-en-vercel)

---

## Descripcion general

La plataforma cubre el ciclo completo de control de asistencia escolar:

1. El **administrador** configura carreras, periodos, materias, grupos y asigna docentes y alumnos.
2. El **docente** abre una sesion de clase, muestra el codigo QR a los alumnos y la cierra al terminar.
3. El **alumno** escanea el QR desde su dispositivo movil para registrar su asistencia.
4. Al cerrar la sesion el sistema calcula la tasa de asistencia de cada alumno y genera notificaciones si cae por debajo de los umbrales configurados.
5. Los alumnos pueden enviar justificantes con archivo adjunto; los docentes los aprueban o rechazan.
6. Los reportes de asistencia se exportan en Excel o PDF.

---

## Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript estricto) |
| Base de datos | Neon PostgreSQL 17 via `@neondatabase/serverless` |
| ORM | Drizzle ORM + drizzle-kit |
| Autenticacion | Auth.js v5 — Credentials provider + JWT |
| Archivos | Vercel Blob |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Formularios | React Hook Form + Zod |
| Estado del servidor | TanStack Query v5 |
| Generacion de QR | `qrcode` (Node) |
| Escaneo de QR | `html5-qrcode` (navegador) |
| JWT auxiliar | `jose` (HS256) |
| Reportes | `xlsx` + `jspdf` + `jspdf-autotable` |
| Notificaciones | Server-Sent Events (SSE) sin WebSockets externos |
| Notificaciones UI | `sonner` |

---

## Requisitos previos

- Node.js 20 o superior
- Una base de datos Neon PostgreSQL (cuenta gratuita disponible en neon.tech)
- Cuenta en Vercel para despliegue y Vercel Blob

---

## Instalacion y configuracion

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd qr-assistance

# 2. Instalar dependencias
npm install

# 3. Copiar el archivo de variables de entorno
cp .env.example .env.local

# 4. Editar .env.local con los valores reales (ver seccion siguiente)

# 5. Aplicar la migracion a la base de datos
npx dotenv-cli -e .env.local -- npx drizzle-kit migrate

# 6. Ejecutar el seed inicial (admin + umbrales)
npx dotenv-cli -e .env.local -- npx tsx scripts/seed.ts

# 7. Iniciar el servidor de desarrollo
npx dotenv-cli -e .env.local -- npx next dev --port 3000
```

La aplicacion estara disponible en `http://localhost:3000`.

---

## Variables de entorno

Crear el archivo `.env.local` en la raiz del proyecto con las siguientes claves:

```env
# Cadena de conexion pooled de Neon (para la aplicacion)
DATABASE_URL=postgresql://usuario:contrasena@host-pooler/neondb?sslmode=require

# Cadena de conexion directa de Neon (para migraciones con drizzle-kit)
DATABASE_URL_UNPOOLED=postgresql://usuario:contrasena@host-directo/neondb?sslmode=require

# Secreto para firmar las sesiones JWT de Auth.js (minimo 32 caracteres)
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET=

# URL publica de la aplicacion
NEXTAUTH_URL=http://localhost:3000

# Secreto para firmar los tokens QR de sesion (minimo 32 caracteres)
# Generar con: openssl rand -base64 32
QR_JWT_SECRET=

# Token de Vercel Blob para subir archivos de justificantes (opcional)
BLOB_READ_WRITE_TOKEN=
```

Si `BLOB_READ_WRITE_TOKEN` esta vacio el sistema funciona normalmente pero no acepta archivos adjuntos en los justificantes.

---

## Base de datos

### Esquema

El sistema define 12 tablas en PostgreSQL:

| Tabla | Descripcion |
|---|---|
| `users` | Usuarios del sistema con rol admin, teacher o student |
| `careers` | Carreras academicas |
| `periods` | Periodos escolares con indicador de activo |
| `subjects` | Materias con numero de sesiones planeadas |
| `groups` | Grupos que pertenecen a una carrera y un periodo |
| `group_subjects` | Relacion grupo-materia-docente |
| `group_students` | Alumnos inscritos en cada grupo |
| `class_sessions` | Sesiones de clase con estado active, closed o cancelled |
| `attendances` | Registro de asistencia por sesion y alumno |
| `justifications` | Justificantes enviados por los alumnos |
| `notifications_log` | Alertas generadas automaticamente por el sistema |
| `threshold_settings` | Umbrales de asistencia configurables |

### Migraciones

```bash
# Generar archivos de migracion a partir del schema
npx dotenv-cli -e .env.local -- npx drizzle-kit generate

# Aplicar migraciones pendientes
npx dotenv-cli -e .env.local -- npx drizzle-kit migrate
```

### Seed inicial

El script `scripts/seed.ts` inserta si no existen:

- Usuario administrador: `admin@itcelaya.edu.mx` / `password`
- Umbrales de asistencia: advertencia 75%, riesgo 60%, critico 50%

```bash
npx dotenv-cli -e .env.local -- npx tsx scripts/seed.ts
```

---

## Estructura del proyecto

```
qr-assistance/
├── drizzle/                          # Archivos de migracion generados
├── scripts/
│   └── seed.ts                       # Seed inicial de la base de datos
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/    # Handlers de Auth.js
│   │       │   └── token/            # Endpoint JWT para clientes API
│   │       ├── users/
│   │       ├── careers/
│   │       ├── periods/
│   │       ├── subjects/
│   │       ├── groups/
│   │       ├── sessions/
│   │       ├── attendance/
│   │       ├── justifications/
│   │       ├── dashboard/
│   │       ├── notifications/
│   │       ├── reports/
│   │       └── settings/
│   ├── components/
│   │   └── ui/                       # Componentes shadcn/ui
│   └── lib/
│       ├── auth.ts                   # Configuracion de Auth.js
│       ├── auth-helpers.ts           # requireAuth / requireRole
│       ├── alerts.ts                 # Logica de alertas de asistencia
│       ├── qr.ts                     # Firma y verificacion de tokens QR
│       ├── utils.ts                  # ok() / fail() y cn()
│       └── db/
│           ├── index.ts              # Conexion Drizzle + Neon
│           ├── schema.ts             # Definicion de todas las tablas
│           └── queries/              # Funciones de acceso a datos por dominio
│               ├── users.ts
│               ├── careers.ts
│               ├── periods.ts
│               ├── subjects.ts
│               ├── groups.ts
│               ├── sessions.ts
│               ├── attendance.ts
│               ├── justifications.ts
│               ├── notifications.ts
│               ├── settings.ts
│               └── reports.ts
├── middleware.ts                     # Proteccion de rutas y validacion JWT
├── drizzle.config.ts
├── next.config.ts
├── .env.example
└── QR-Assistance.postman_collection.json
```

---

## Autenticacion

El sistema utiliza Auth.js v5 con estrategia JWT sin sesiones en base de datos.

### Mecanismos soportados

**Cookie HTTP-only (navegador)**

Auth.js gestiona la sesion automaticamente mediante una cookie segura. Este es el mecanismo que usa el frontend.

**Bearer token (clientes API)**

Para pruebas con Postman u otros clientes, el endpoint `POST /api/auth/token` retorna un JWT que se envia en el header:

```
Authorization: Bearer <token>
```

El middleware y los helpers de autenticacion aceptan ambos mecanismos de forma transparente.

### Payload del JWT

```json
{
  "id": "1",
  "name": "Administrador",
  "email": "admin@itcelaya.edu.mx",
  "role": "admin",
  "enrollmentNumber": null
}
```

---

## Roles y permisos

| Rol | Descripcion |
|---|---|
| `admin` | Acceso completo a catalogos, grupos, configuracion y reportes |
| `teacher` | Gestiona sus propias sesiones, lista de asistencia y justificantes |
| `student` | Registra asistencia via QR, consulta historial y envia justificantes |

El middleware redirige al login si la sesion no existe y retorna 403 si el rol no tiene acceso a la ruta solicitada.

---

## API referencia de endpoints

Todas las respuestas siguen la estructura:

```json
// Exito
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "message": "...", "errors": { ... } }
```

### Autenticacion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/token` | Obtener Bearer JWT (solo desarrollo) |

### Usuarios

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/users` | admin | Listar todos los usuarios |

### Carreras

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/careers` | admin | Listar carreras |
| POST | `/api/careers` | admin | Crear carrera `{ name, code, active? }` |
| GET | `/api/careers/:id` | admin | Detalle de carrera |
| PUT | `/api/careers/:id` | admin | Actualizar carrera |
| DELETE | `/api/careers/:id` | admin | Eliminar si no tiene grupos |

### Periodos

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/periods` | admin | Listar periodos |
| POST | `/api/periods` | admin | Crear periodo `{ name, startDate, endDate, active? }` |
| GET | `/api/periods/:id` | admin | Detalle de periodo |
| PUT | `/api/periods/:id` | admin | Actualizar; si `active=true` desactiva los demas |
| DELETE | `/api/periods/:id` | admin | Eliminar si no tiene grupos |

### Materias

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/subjects` | admin | Listar materias |
| POST | `/api/subjects` | admin | Crear materia `{ name, code, totalSessions }` |
| GET | `/api/subjects/:id` | admin | Detalle de materia |
| PUT | `/api/subjects/:id` | admin | Actualizar materia |
| DELETE | `/api/subjects/:id` | admin | Eliminar si no esta asignada a grupos |

### Grupos

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/groups` | admin | Listar grupos con carrera y periodo anidados |
| POST | `/api/groups` | admin | Crear grupo `{ name, careerId, periodId }` |
| GET | `/api/groups/:id` | admin | Detalle con materias y alumnos inscritos |
| PUT | `/api/groups/:id` | admin | Actualizar grupo |
| DELETE | `/api/groups/:id` | admin | Eliminar grupo |
| POST | `/api/groups/:id/subjects` | admin | Asignar materia `{ subjectId, teacherId }` |
| DELETE | `/api/groups/:id/subjects/:gsId` | admin | Remover materia si no tiene sesiones |
| POST | `/api/groups/:id/students` | admin | Inscribir alumno `{ studentId }` |
| DELETE | `/api/groups/:id/students/:studentId` | admin | Desinscribir alumno |

### Sesiones de clase

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/sessions` | teacher | Listar sesiones propias; query: `status`, `groupSubjectId` |
| POST | `/api/sessions` | teacher | Crear sesion; registra ausente para todos los alumnos |
| GET | `/api/sessions/:id` | teacher/admin | Detalle de sesion |
| PUT | `/api/sessions/:id` | teacher | Editar tolerancia y configuracion geo solo si activa |
| POST | `/api/sessions/:id/close` | teacher | Cerrar sesion y disparar alertas |
| GET | `/api/sessions/:id/qr` | teacher | Obtener token QR con expiracion de 5 minutos |
| GET | `/api/sessions/:id/attendances` | teacher/admin | Lista de asistencias con datos del alumno |

### Asistencia

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/api/attendance/qr` | student | Registrar con token QR `{ qrToken, latitude?, longitude? }` |
| POST | `/api/attendance/manual` | teacher | Cambiar estado `{ sessionId, studentId, status }` |
| GET | `/api/attendance/history` | student | Historial propio con tasa; query: `groupSubjectId?` |

### Justificantes

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/justifications` | admin/teacher/student | Listar justificantes filtrados por rol |
| POST | `/api/justifications` | student | Enviar via FormData `{ attendanceId, description?, file? }` |
| GET | `/api/justifications/:id` | admin/teacher/student | Detalle con URL del archivo |
| POST | `/api/justifications/:id/approve` | teacher/admin | Aprobar; cambia asistencia a justified |
| POST | `/api/justifications/:id/reject` | teacher/admin | Rechazar `{ rejectionReason }` |

### Dashboard

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/dashboard/admin` | admin | Totales, periodo activo, tasa del dia y alertas recientes |
| GET | `/api/dashboard/teacher` | teacher | Grupos, sesion activa, justificantes y resumen de asistencia |
| GET | `/api/dashboard/student` | student | Materias con tasa, justificantes y ultimas asistencias |

### Notificaciones

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/notifications` | cualquiera | Listar notificaciones propias; query: `unreadOnly=true` |
| GET | `/api/notifications/stream` | cualquiera | SSE: emite `{ unreadCount }` cada 5s y `{ ping }` cada 15s |
| POST | `/api/notifications/:id/read` | cualquiera | Marcar una notificacion como leida |
| POST | `/api/notifications/read-all` | cualquiera | Marcar todas como leidas |

### Reportes

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/reports/excel?groupSubjectId=N` | admin/teacher | Descargar `.xlsx` con hojas Resumen y Detalle |
| GET | `/api/reports/pdf?groupSubjectId=N` | admin/teacher | Descargar `.pdf` con tabla de asistencias |

### Configuracion

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/settings/thresholds` | admin | Leer umbrales actuales |
| PUT | `/api/settings/thresholds` | admin | Actualizar `{ attendanceWarning, attendanceRisk, attendanceCritical }` |

---

## Logica de alertas

Al cerrar una sesion mediante `POST /api/sessions/:id/close` se ejecuta `checkAttendanceAlerts()` de forma no bloqueante. Esta funcion:

1. Obtiene el grupo-materia de la sesion cerrada.
2. Cuenta todas las sesiones cerradas de ese grupo-materia.
3. Para cada alumno del grupo calcula su tasa: `(present + justified) / total_cerradas * 100`.
4. Compara contra los umbrales configurados en `threshold_settings`.
5. Inserta una notificacion en `notifications_log` si la tasa cae por debajo de algun umbral.

| Condicion | Tipo de alerta |
|---|---|
| Tasa menor al umbral critico (defecto 50%) | `critical` |
| Tasa menor al umbral de riesgo (defecto 60%) | `risk` |
| Tasa menor al umbral de advertencia (defecto 75%) | `warning` |
| Tasa mayor o igual al umbral de advertencia | Sin notificacion |

Los umbrales se modifican desde `PUT /api/settings/thresholds` y deben cumplir la relacion: `critico < riesgo < advertencia <= 100`.

---

## Reportes

### Excel

El archivo generado contiene dos hojas:

- **Resumen**: materia, grupo, docente y porcentaje de asistencia promedio del grupo.
- **Detalle**: una fila por alumno con una columna por sesion. Los valores son `P` (presente), `A` (ausente) o `J` (justificado). La ultima columna muestra el porcentaje individual de cada alumno.

### PDF

Tabla generada con `jspdf-autotable` en orientacion automatica segun el numero de sesiones. Incluye cabecera con nombre de materia, grupo, docente y promedio general del grupo.

---

## Pruebas con Postman

### Importar la coleccion

1. Abrir Postman.
2. Hacer clic en **Import**.
3. Seleccionar el archivo `QR-Assistance.postman_collection.json` en la raiz del proyecto.

### Flujo basico de prueba

```
1. Auth > Login Admin          guarda {{authToken}} automaticamente
2. POST /api/careers           crear una carrera
3. POST /api/periods           crear un periodo con active: true
4. POST /api/subjects          crear una materia
5. POST /api/groups            crear un grupo

   Registrar usuarios teacher y student en la base de datos

6. Auth > Login Teacher        cambiar a sesion de docente
7. POST /api/groups/:id/subjects   asignar materia al grupo con teacherId
8. POST /api/groups/:id/students   inscribir alumno al grupo
9. POST /api/sessions          crear sesion de clase
10. GET /api/sessions/:id/qr   obtener token QR (se guarda en {{qrToken}})

    Auth > Login Student        cambiar a sesion de alumno

11. POST /api/attendance/qr    registrar asistencia con {{qrToken}}

    Auth > Login Teacher        volver a docente

12. POST /api/sessions/:id/close   cerrar sesion y disparar alertas
13. GET /api/reports/excel?groupSubjectId=1   descargar reporte
```

### Variables de coleccion

| Variable | Descripcion |
|---|---|
| `baseUrl` | URL base del servidor; defecto `http://localhost:3000` |
| `authToken` | JWT activo; se actualiza automaticamente al hacer login |
| `qrToken` | Token de QR; se actualiza al obtener el QR de una sesion |
| `careerId`, `periodId`, `subjectId`, etc. | IDs de registros creados; actualizar manualmente segun los resultados |

---

## Despliegue en Vercel

1. Conectar el repositorio en el panel de Vercel.
2. Agregar todas las variables de entorno del archivo `.env.example` en **Settings > Environment Variables**.
3. Agregar `BLOB_READ_WRITE_TOKEN` desde **Storage > Blob** en el panel de Vercel.
4. Vercel detecta Next.js automaticamente y configura el build sin ajustes adicionales.

Para habilitar el endpoint `/api/auth/token` en produccion agregar la variable `ALLOW_TOKEN_ENDPOINT=true`. Se recomienda no hacerlo salvo en entornos de QA controlados.

---

## Credenciales de acceso inicial

Despues de ejecutar el seed:

| Campo | Valor |
|---|---|
| Email | `admin@itcelaya.edu.mx` |
| Contrasena | `password` |
| Rol | `admin` |

Cambiar la contrasena del administrador inmediatamente despues del primer acceso en produccion.
