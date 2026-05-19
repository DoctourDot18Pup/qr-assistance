# Sistema de Control de Asistencia Academica — QR Assistance

Sistema web monorepo construido con Next.js 16 que permite a instituciones educativas gestionar la asistencia mediante codigos QR, con soporte de justificantes, alertas automaticas y reportes descargables. La interfaz es completamente responsiva y funciona tanto en escritorio como en dispositivos moviles.

Desplegado en: **https://qr-assistance-psi.vercel.app**

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
- [Convencion de correos electronicos](#convencion-de-correos-electronicos)
- [Importacion masiva de usuarios via CSV](#importacion-masiva-de-usuarios-via-csv)
- [Casos de uso](#casos-de-uso)
- [API referencia de endpoints](#api-referencia-de-endpoints)
- [Ejemplos de respuestas JSON](#ejemplos-de-respuestas-json)
- [Logica de alertas](#logica-de-alertas)
- [Reportes](#reportes)
- [Interfaz responsiva](#interfaz-responsiva)
- [Despliegue en Vercel](#despliegue-en-vercel)

---

## Descripcion general

La plataforma cubre el ciclo completo de control de asistencia escolar:

1. El **administrador** configura carreras, periodos, materias, grupos y asigna docentes y alumnos. Puede importar listados masivos desde archivos CSV.
2. El **docente** abre una sesion de clase, muestra el codigo QR a los alumnos y la cierra al terminar. Tambien puede importar su lista de alumnos con CSV.
3. El **alumno** escanea el QR desde su dispositivo movil para registrar su asistencia.
4. Al cerrar la sesion el sistema calcula la tasa de asistencia de cada alumno y genera notificaciones si cae por debajo de los umbrales configurados.
5. Los alumnos pueden enviar justificantes con archivo adjunto; los docentes los aprueban o rechazan.
6. Los reportes de asistencia se exportan en PDF.

---

## Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, TypeScript estricto) |
| Base de datos | Neon PostgreSQL 17 via `@neondatabase/serverless` |
| ORM | Drizzle ORM 0.45 + drizzle-kit |
| Autenticacion | Auth.js v5 — Credentials provider + JWT |
| Archivos | Vercel Blob (store privado) |
| UI | Tailwind CSS v4 + lucide-react |
| Estado del servidor | Server Components + Server Actions |
| Generacion de QR | `qrcode` (Node) |
| Escaneo de QR | `html5-qrcode` (navegador) |
| JWT auxiliar | `jose` (HS256) |
| Reportes | `jspdf` + `jspdf-autotable` |
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

# 5. Sincronizar el esquema con la base de datos
npx drizzle-kit push

# 6. Ejecutar el seed inicial (admin + umbrales)
npx tsx scripts/seed.ts

# 7. Iniciar el servidor de desarrollo
npx next dev
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
# En desarrollo: http://localhost:3000
# En produccion: https://tu-dominio.vercel.app
NEXTAUTH_URL=http://localhost:3000

# Secreto para firmar los tokens QR de sesion (minimo 32 caracteres)
# Generar con: openssl rand -base64 32
QR_JWT_SECRET=

# Token del Blob store privado de Vercel para archivos de justificantes
# Obtenido desde Vercel > Storage > Blob > Connect store
BLOB_READ_WRITE_TOKEN=
```

> Si `BLOB_READ_WRITE_TOKEN` esta vacio el sistema funciona normalmente pero los justificantes no admiten archivos adjuntos.

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
| `class_sessions` | Sesiones de clase con estado active o closed |
| `attendances` | Registro de asistencia por sesion y alumno |
| `justifications` | Justificantes enviados por los alumnos |
| `notifications_log` | Alertas generadas automaticamente por el sistema |
| `threshold_settings` | Umbrales de asistencia configurables |

### Sincronizacion del esquema

```bash
# Aplicar el esquema directamente a la base de datos (desarrollo)
npx drizzle-kit push

# Generar archivos de migracion a partir del schema (produccion)
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Seed inicial

El script `scripts/seed.ts` inserta si no existen:

- Usuario administrador: `admin@itcelaya.edu.mx` / `Bienvenido123`
- Umbrales de asistencia: advertencia 75%, riesgo 60%, critico 50%

```bash
npx tsx scripts/seed.ts
```

---

## Estructura del proyecto

```
qr-assistance/
├── scripts/
│   └── seed.ts                            # Seed inicial de la base de datos
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/                     # Pagina de inicio de sesion
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # Layout compartido con sidebar
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx               # Dashboard administrador
│   │   │   │   ├── users/                 # Gestion de usuarios + importacion CSV
│   │   │   │   ├── groups/                # Gestion de grupos
│   │   │   │   ├── reports/               # Reportes globales de asistencia
│   │   │   │   └── settings/
│   │   │   │       ├── careers/           # Carreras academicas
│   │   │   │       ├── periods/           # Periodos escolares
│   │   │   │       ├── subjects/          # Materias
│   │   │   │       └── thresholds/        # Umbrales de alerta
│   │   │   ├── teacher/
│   │   │   │   ├── groups/                # Mis grupos + importacion CSV de alumnos
│   │   │   │   │   └── [groupId]/import/  # Importacion de alumnos por grupo
│   │   │   │   ├── sessions/              # Sesiones de clase
│   │   │   │   │   └── [id]/              # Sesion activa / cerrada con QR en vivo
│   │   │   │   ├── justifications/        # Revision de justificantes
│   │   │   │   └── reports/               # Reportes por grupo-materia
│   │   │   └── student/
│   │   │       ├── page.tsx               # Dashboard alumno
│   │   │       ├── scan/                  # Escaneo de QR con camara
│   │   │       ├── subjects/              # Historial de asistencia por materia
│   │   │       └── justifications/        # Envio y seguimiento de justificantes
│   │   └── api/
│   │       ├── auth/[...nextauth]/        # Handlers de Auth.js
│   │       ├── sessions/[id]/
│   │       │   ├── qr/                    # Token QR con expiracion 5 min
│   │       │   └── attendees/             # Lista de asistentes en tiempo real
│   │       ├── attendance/qr/             # Registro de asistencia via token QR
│   │       ├── reports/pdf/               # Exportacion de reportes en PDF
│   │       ├── blob-download/             # Proxy autenticado para archivos privados
│   │       └── notifications/             # Notificaciones del usuario
│   ├── components/
│   │   ├── shell/
│   │   │   ├── sidebar.tsx                # Sidebar con drawer movil
│   │   │   ├── sidebar-context.tsx        # Context para estado open/close del sidebar
│   │   │   └── header.tsx                 # Header con hamburger menu en movil
│   │   └── ui/
│   │       └── qr-badge.tsx               # Badge con tonos de asistencia
│   └── lib/
│       ├── auth.ts                        # Configuracion de Auth.js
│       ├── qr.ts                          # Firma y verificacion de tokens QR
│       └── db/
│           ├── index.ts                   # Conexion Drizzle + Neon
│           └── schema.ts                  # Definicion de todas las tablas
├── middleware.ts                          # Proteccion de rutas por rol
├── drizzle.config.ts
└── next.config.ts
```

---

## Autenticacion

El sistema utiliza Auth.js v5 con estrategia JWT sin sesiones en base de datos. La sesion se gestiona automaticamente mediante una cookie HTTP-only segura.

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

| Rol | Acceso |
|---|---|
| `admin` | Acceso completo a catalogos, grupos, configuracion, reportes globales e importacion de usuarios |
| `teacher` | Gestiona sus propias sesiones, grupos, lista de asistencia, justificantes y reportes por materia |
| `student` | Registra asistencia via QR, consulta historial por materia y envia justificantes |

El middleware redirige al login si la sesion no existe y retorna 403 si el rol no tiene acceso a la ruta solicitada.

---

## Convencion de correos electronicos

Los correos electronicos siguen una convencion institucional:

- **Estudiantes**: se generan automaticamente a partir de la matricula en formato `{matricula}@itcelaya.edu.mx`. No es necesario especificar un correo en la importacion.
- **Docentes y administradores**: requieren correo explicito en el archivo CSV.

---

## Importacion masiva de usuarios via CSV

El sistema permite dar de alta multiples usuarios a la vez desde archivos CSV, tanto desde el panel de administrador como desde el panel de docente.

### Importacion de admin (`/admin/users/import`)

**Rol requerido:** Administrador

**Formato del CSV:**

```csv
nombre,correo,matricula,rol
Ana Martinez,,21031001,student
Carlos Perez,,21031002,student
Maria Lopez,maria.lopez@itcelaya.edu.mx,,teacher
Juan Gomez,juan.gomez@itcelaya.edu.mx,,admin
```

- Para `rol=student`: el campo `correo` puede dejarse vacio; se genera como `{matricula}@itcelaya.edu.mx`.
- Para `rol=teacher` o `rol=admin`: el campo `correo` es obligatorio.
- La contrasena inicial para todos los usuarios importados es `Bienvenido123`.
- Si el correo o la matricula ya existen en el sistema, la fila se omite sin error.

**Resultado:** Vista de KPIs con conteo de Creados, Omitidos y Errores por fila.

---

### Importacion de alumnos por grupo (`/teacher/groups/[id]/import`)

**Rol requerido:** Docente (propietario del grupo)

**Formato del CSV:**

```csv
nombre,matricula
Pedro Sanchez,21031010
Laura Torres,21031011
Miguel Reyes,21031012
```

- El correo siempre se genera automaticamente como `{matricula}@itcelaya.edu.mx`.
- Si el alumno no existe se crea con contrasena `Bienvenido123`.
- Si el alumno ya existe pero no esta inscrito en el grupo, se inscribe directamente.
- Si el alumno ya esta inscrito en el grupo, la fila se marca como "Ya inscrito".
- Al inscribir a un alumno, el sistema pre-inserta registros de ausencia en todas las sesiones activas del grupo.

**Resultado:** Vista de KPIs con conteo de Añadidos, Ya inscritos y Errores.

---

## Casos de uso

### CU-01 Configuracion inicial de la institucion

**Actor:** Administrador

El administrador crea las carreras, el periodo activo, las materias y los grupos. Luego asigna docentes a cada grupo-materia e inscribe alumnos. Puede hacer la carga inicial de forma masiva con CSV.

---

### CU-02 Apertura de sesion de clase

**Actor:** Docente

El docente crea una sesion desde **Mis Sesiones** seleccionando el grupo-materia. El sistema registra una falta automatica para cada alumno inscrito y muestra el codigo QR en pantalla.

El QR se regenera automaticamente cada 4.5 minutos. El docente puede forzar la regeneracion con el boton **Regenerar QR**.

---

### CU-03 Registro de asistencia mediante QR

**Actor:** Alumno

El alumno accede a **Escanear QR** desde su dispositivo movil, apunta la camara al codigo proyectado y el sistema registra su asistencia como presente. El token QR expira a los 5 minutos.

Si el docente habilito restriccion geografica, el sistema valida que el alumno este dentro del radio configurado usando GPS.

---

### CU-04 Cierre de sesion y generacion de alertas

**Actor:** Docente

Al pulsar **Cerrar sesion**, el sistema calcula la tasa de asistencia de cada alumno. Si alguna tasa cae por debajo de los umbrales configurados, genera notificaciones automaticamente.

---

### CU-05 Envio y resolucion de justificante

**Actor:** Alumno / Docente

El alumno localiza su falta en **Mis justificantes**, redacta una descripcion y opcionalmente adjunta un archivo (PDF, JPG o PNG). El archivo se sube al Blob store privado de Vercel.

El docente ve el justificante en **Justificantes** y puede ver el archivo adjunto a traves del proxy autenticado `/api/blob-download`. Aprueba o rechaza con una razon que queda visible para el alumno.

---

### CU-06 Consulta de historial de asistencia

**Actor:** Alumno

En **Mis materias** el alumno ve su porcentaje de asistencia por materia con un badge de color segun el umbral (verde, amarillo, naranja o rojo).

---

### CU-07 Generacion de reportes

**Actor:** Administrador / Docente

En **Reportes** se selecciona el grupo-materia y se descarga el reporte en PDF con la lista completa de asistencias por alumno.

---

### CU-08 Configuracion de umbrales de asistencia

**Actor:** Administrador

En **Configuracion > Umbrales** se ajustan los porcentajes de advertencia, riesgo y critico. Deben cumplir la relacion: `critico < riesgo < advertencia <= 100`.

---

## API referencia de endpoints

### Sesiones de clase

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/api/sessions` | teacher | Crear sesion; pre-inserta ausentes para todos los alumnos |
| GET | `/api/sessions/:id/qr` | teacher | Token QR con expiracion de 5 minutos |
| GET | `/api/sessions/:id/attendees` | teacher | Lista de presentes en tiempo real (usado por polling) |
| POST | `/api/sessions/:id/close` | teacher | Cerrar sesion y disparar alertas |

### Asistencia

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/api/attendance/qr` | student | Registrar con token QR `{ qrToken, latitude?, longitude? }` |

### Justificantes

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| POST | `/student/justifications` (action) | student | Enviar justificante con archivo via Server Action |
| POST | `/teacher/justifications` (action) | teacher | Aprobar o rechazar via Server Action |

### Archivos privados

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/blob-download?url=<blobUrl>` | cualquiera autenticado | Proxy autenticado que sirve archivos del Blob store privado usando `Authorization: Bearer` server-side. El token nunca se expone al cliente. |

### Reportes

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/reports/pdf?gsId=N` | admin/teacher | Descargar reporte PDF del grupo-materia |

### Notificaciones

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| GET | `/api/notifications` | cualquiera | Listar notificaciones propias |

---

## Ejemplos de respuestas JSON

### Autenticacion

**`POST /api/auth/token`**
```json
// Request
{ "email": "21031430@itcelaya.edu.mx", "password": "Bienvenido123" }

// 200 OK
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

// 401 Unauthorized
{ "error": "Credenciales invalidas." }
```

---

### Asistencia

**`POST /api/attendance/qr`** — Registrar asistencia por QR
```json
// Request
{ "qrToken": "a3f8c2d1-9b4e-4f7a-8c3d-1e2f5a6b7c8d" }

// 200 — exito
{ "success": true, "message": "Asistencia registrada correctamente." }

// 400 — token expirado o sesion inactiva
{ "success": false, "message": "La sesion ya no esta activa o el codigo QR expiro." }

// 409 — asistencia ya registrada
{ "success": false, "message": "Tu asistencia ya fue registrada en esta sesion." }
```

**`GET /api/attendance/history`** — Historial del alumno autenticado
```json
[
  {
    "sessionId": 12,
    "date": "2026-05-15T10:00:00.000Z",
    "subjectName": "Programacion Web",
    "groupName": "ISC-7A",
    "status": "present",
    "method": "qr"
  },
  {
    "sessionId": 11,
    "date": "2026-05-13T10:00:00.000Z",
    "subjectName": "Programacion Web",
    "groupName": "ISC-7A",
    "status": "justified",
    "method": null
  },
  {
    "sessionId": 10,
    "date": "2026-05-08T10:00:00.000Z",
    "subjectName": "Programacion Web",
    "groupName": "ISC-7A",
    "status": "absent",
    "method": null
  }
]
```

---

### Sesiones

**`POST /api/sessions`** — Crear sesion
```json
// Request
{ "groupSubjectId": 3, "toleranceMinutes": 10, "geoEnabled": false }

// 201 Created
{
  "id": 14,
  "status": "active",
  "date": "2026-05-18T14:30:00.000Z",
  "qrToken": "b9e1d4f2-3a7c-4b8d-9e2f-1c3d5e7f9a1b"
}
```

**`GET /api/sessions`** — Listar sesiones del docente
```json
[
  {
    "id": 12,
    "date": "2026-05-15T10:00:00.000Z",
    "status": "closed",
    "groupName": "ISC-7A",
    "subjectName": "Programacion Web",
    "attendeesCount": 28
  },
  {
    "id": 13,
    "date": "2026-05-18T10:00:00.000Z",
    "status": "active",
    "groupName": "ISC-7A",
    "subjectName": "Programacion Web",
    "attendeesCount": 15
  }
]
```

**`GET /api/sessions/[id]/qr`** — Token QR activo
```json
{
  "qrToken": "b9e1d4f2-3a7c-4b8d-9e2f-1c3d5e7f9a1b",
  "expiresAt": "2026-05-18T14:31:00.000Z"
}
```

**`POST /api/sessions/[id]/close`** — Cerrar sesion
```json
{
  "ok": true,
  "sessionId": 14,
  "closedAt": "2026-05-18T15:45:00.000Z",
  "totalStudents": 32,
  "present": 28,
  "absent": 4
}
```

---

### Grupos

**`GET /api/groups`** — Listar grupos
```json
[
  {
    "id": 1,
    "name": "ISC-7A",
    "careerId": 1,
    "careerName": "Ingenieria en Sistemas Computacionales",
    "periodId": 2,
    "periodName": "Ene-Jun 2026",
    "studentCount": 32
  }
]
```

**`GET /api/groups/[id]/students`** — Alumnos de un grupo
```json
[
  {
    "id": 45,
    "name": "Garcia Lopez Ana",
    "email": "21031430@itcelaya.edu.mx",
    "enrollmentNumber": "21031430"
  },
  {
    "id": 46,
    "name": "Martinez Soto Luis",
    "email": "21031431@itcelaya.edu.mx",
    "enrollmentNumber": "21031431"
  }
]
```

---

### Justificantes

**`POST /api/justifications`** — Enviar justificante (`multipart/form-data`)
```json
// 200 — exito
{ "ok": true, "justificationId": 8 }

// 400 — ya existe justificante para esa sesion
{ "ok": false, "message": "Ya enviaste un justificante para esta sesion." }
```

**`GET /api/justifications`** — Listar justificantes (filtrados por rol)
```json
[
  {
    "id": 8,
    "status": "pending",
    "description": "Consulta medica urgente",
    "filePath": "https://xxx.blob.vercel-storage.com/justifications/archivo.pdf",
    "createdAt": "2026-05-16T09:00:00.000Z",
    "studentName": "Garcia Lopez Ana",
    "subjectName": "Programacion Web",
    "sessionDate": "2026-05-15T10:00:00.000Z"
  }
]
```

**`POST /api/justifications/[id]/approve`** y **`/reject`**
```json
{ "ok": true }
```

---

### Notificaciones

**`GET /api/notifications`**
```json
[
  {
    "id": 3,
    "type": "low_attendance",
    "message": "Tu asistencia en Programacion Web ha bajado al 72%. El minimo requerido es 85%.",
    "read": false,
    "createdAt": "2026-05-18T15:46:00.000Z"
  }
]
```

---

### Dashboard

**`GET /api/dashboard/teacher`**
```json
{
  "groupCount": 3,
  "sessionsTodayCount": 2,
  "nextSessionAt": "2026-05-18T16:00:00.000Z",
  "groups": [
    {
      "gsId": 5,
      "groupName": "ISC-7A",
      "subjectName": "Programacion Web",
      "studentCount": 32,
      "attendanceAvg": 87
    }
  ]
}
```

**`GET /api/dashboard/student`**
```json
{
  "studentName": "Garcia Lopez Ana",
  "subjects": [
    {
      "subjectName": "Programacion Web",
      "groupName": "ISC-7A",
      "present": 12,
      "absent": 2,
      "justified": 1,
      "total": 15,
      "attendanceRate": 87
    }
  ],
  "overallRate": 87,
  "pendingJustifications": 1
}
```

---

### Errores comunes

Todos los errores siguen la misma estructura:

```json
// 401 — sesion inexistente o expirada
{ "error": "No autenticado" }

// 403 — rol sin permiso para la ruta
{ "error": "No autorizado" }

// 422 — parametro requerido ausente
{ "error": "gsId es requerido." }

// 500 — fallo interno
{ "error": "Error interno del servidor." }
```

---

## Logica de alertas

Al cerrar una sesion se ejecuta la verificacion de alertas de forma no bloqueante:

1. Se cuentan todas las sesiones cerradas del grupo-materia.
2. Para cada alumno se calcula: `(presentes + justificados) / total_cerradas * 100`.
3. Se inserta una notificacion segun el umbral superado.

| Condicion | Tipo de alerta |
|---|---|
| Tasa menor al umbral critico (defecto 50%) | `critical` |
| Tasa menor al umbral de riesgo (defecto 60%) | `risk` |
| Tasa menor al umbral de advertencia (defecto 75%) | `warning` |
| Tasa mayor o igual al umbral de advertencia | Sin notificacion |

---

## Reportes

### PDF

Generado con `jspdf-autotable`. Incluye cabecera con nombre de materia, grupo, docente y sesiones impartidas. La tabla muestra por alumno: presencias, ausencias, justificados y porcentaje final. El pie incluye el promedio general del grupo.

---

## Interfaz responsiva

La aplicacion esta optimizada para dispositivos moviles y escritorio:

- **Sidebar como drawer movil**: en pantallas menores a 768px el sidebar se oculta detras de un overlay. Se abre con el boton hamburger del header y se cierra automaticamente al navegar a otra pagina.
- **Header con hamburger menu**: el boton de menu solo es visible en movil (`md:hidden`).
- **Tablas con scroll horizontal**: todas las tablas del sistema estan envueltas en `overflow-x-auto` con headers `whitespace-nowrap` para evitar saltos de linea en pantallas estrechas.
- **Grids adaptativos**: las cuadriculas de KPIs y tarjetas colapsan de multiples columnas a una sola columna en movil.
- **Formularios de filtros**: los campos de busqueda y filtros usan `flex-wrap` para apilarse verticalmente en movil.
- **Camara en movil**: el escaner QR requiere HTTPS en produccion y permiso de camara en el navegador.

---

## Despliegue en Vercel

### Pasos

1. Conectar el repositorio de GitHub en el panel de Vercel.
2. En **Settings > Environment Variables** agregar todas las variables del archivo `.env.example`:
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` — debe ser la URL publica del proyecto (ej. `https://qr-assistance-psi.vercel.app`)
   - `QR_JWT_SECRET`
3. En **Storage > Blob**, crear un Blob store de tipo **privado** y conectarlo al proyecto. Vercel agrega `BLOB_READ_WRITE_TOKEN` automaticamente.
4. Vercel detecta Next.js automaticamente y realiza el build sin configuracion adicional.

### Notas importantes

- `NEXTAUTH_URL` **debe apuntar al dominio de Vercel** en produccion. Si queda en `http://localhost:3000` el login no funcionara desde dispositivos externos.
- El Blob store debe ser **privado**. Los archivos se sirven a traves del endpoint proxy `/api/blob-download` que valida la sesion antes de hacer el streaming.
- Aplicar el esquema a la base de datos de produccion antes del primer despliegue: `npx drizzle-kit push` con las variables de produccion.

---

## Credenciales de acceso inicial

Despues de ejecutar el seed:

| Campo | Valor |
|---|---|
| Email | `admin@itcelaya.edu.mx` |
| Contrasena | `Bienvenido123` |
| Rol | `admin` |

Cambiar la contrasena del administrador inmediatamente despues del primer acceso en produccion.
