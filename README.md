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
- [Casos de uso](#casos-de-uso)
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

## Casos de uso

### Actores del sistema

El sistema cuenta con tres actores con responsabilidades diferenciadas:

| Actor | Responsabilidad principal |
|---|---|
| Administrador | Configuracion estructural de la institucion |
| Docente | Gestion operativa de clases y asistencia |
| Alumno | Registro y seguimiento de su propia asistencia |

---

### CU-01 Configuracion inicial de la institucion

**Actor:** Administrador

**Descripcion:** Antes de que el sistema pueda operar, el administrador configura los elementos estructurales que definen la organizacion academica.

**Flujo principal:**
1. El administrador crea las carreras academicas de la institucion con su nombre y codigo.
2. Crea un periodo escolar (por ejemplo, Enero-Junio 2025) y lo marca como activo. El sistema desactiva automaticamente cualquier otro periodo que estuviera activo.
3. Registra las materias con su nombre, codigo y numero total de sesiones planeadas.
4. Crea los grupos academicos asignando cada uno a una carrera y al periodo activo.
5. Dentro de cada grupo asigna las materias indicando que docente imparte cada una.
6. Inscribe a los alumnos en los grupos correspondientes.

**Resultado:** La institucion queda configurada y los docentes pueden comenzar a abrir sesiones de clase.

---

### CU-02 Apertura de sesion de clase

**Actor:** Docente

**Descripcion:** El docente abre una sesion al inicio de cada clase para habilitar el registro de asistencia.

**Flujo principal:**
1. El docente accede a la seccion Mis Clases y selecciona el grupo-materia correspondiente.
2. Crea una nueva sesion indicando la fecha, los minutos de tolerancia y si desea restringir el registro por ubicacion geografica.
3. El sistema crea la sesion en estado activo y registra automaticamente una falta para cada alumno inscrito en el grupo.
4. El docente visualiza el codigo QR generado para la sesion en su pantalla.

**Resultado:** La sesion queda activa y el QR esta disponible para que los alumnos registren su asistencia.

---

### CU-03 Registro de asistencia mediante QR

**Actor:** Alumno

**Descripcion:** El alumno escanea el codigo QR proyectado por el docente para registrar su asistencia en tiempo real.

**Flujo principal:**
1. El alumno accede a la seccion Escanear QR desde su dispositivo movil.
2. El sistema solicita permiso para usar la camara.
3. El alumno apunta la camara al codigo QR del docente.
4. El sistema decodifica el token QR y verifica que la sesion siga activa y que el token no haya expirado (expira a los 5 minutos).
5. Si el docente habilito restriccion geografica, el sistema valida que el alumno este dentro del radio permitido usando las coordenadas GPS del dispositivo.
6. El sistema marca la asistencia del alumno como presente y muestra una confirmacion.

**Flujo alternativo — QR expirado:**
El token QR expira cada 5 minutos. El docente puede solicitar uno nuevo desde la pantalla de la sesion. El diseno del frontend regenera el QR automaticamente cada 4.5 minutos sin intervencion del docente.

**Flujo alternativo — fuera del area:**
Si el alumno esta fuera del radio configurado, el sistema rechaza el registro e informa la distancia al punto de clase.

**Flujo alternativo — asistencia duplicada:**
Si el alumno intenta escanear el QR mas de una vez, el sistema responde con un mensaje indicando que su asistencia ya fue registrada.

**Resultado:** La asistencia queda registrada como presente con marca de tiempo y metodo de registro.

---

### CU-04 Registro manual de asistencia

**Actor:** Docente

**Descripcion:** El docente puede modificar el estado de asistencia de cualquier alumno de forma manual, por ejemplo en caso de fallo de camara o red.

**Flujo principal:**
1. El docente accede al detalle de la sesion activa.
2. Visualiza la lista de alumnos con su estado actual (presente, ausente, justificado).
3. Cambia el estado de uno o varios alumnos mediante un control de seleccion.
4. El sistema actualiza el registro inmediatamente.

**Resultado:** El estado de asistencia queda actualizado segun el criterio del docente.

---

### CU-05 Cierre de sesion y generacion de alertas

**Actor:** Docente

**Descripcion:** Al terminar la clase el docente cierra la sesion, lo que consolida los registros y activa la verificacion de alertas.

**Flujo principal:**
1. El docente pulsa el boton Cerrar Sesion desde la pantalla de la sesion activa.
2. El sistema cambia el estado de la sesion a cerrada y registra la hora de cierre.
3. De forma automatica y no bloqueante el sistema calcula la tasa de asistencia acumulada de cada alumno del grupo en esa materia.
4. Para cada alumno cuya tasa caiga por debajo de los umbrales configurados, el sistema genera una notificacion del tipo correspondiente (advertencia, riesgo o critico).
5. Los alumnos con alertas reciben la notificacion la proxima vez que accedan a la plataforma o en tiempo real si tienen el stream SSE activo.

**Resultado:** La sesion queda consolidada y los alumnos en situacion de riesgo son notificados automaticamente.

---

### CU-06 Envio y resolucion de justificante

**Actor:** Alumno / Docente

**Descripcion:** Un alumno que faltó a clase puede solicitar que su ausencia sea justificada adjuntando documentacion de respaldo.

**Flujo — envio (Alumno):**
1. El alumno accede a su historial de asistencia y localiza la falta que desea justificar.
2. Selecciona la opcion Justificar, redacta una descripcion y opcionalmente adjunta un archivo (constancia medica, oficio, etc.).
3. El sistema valida que la asistencia pertenezca al alumno y que este en estado ausente.
4. Si hay archivo, lo sube a Vercel Blob y almacena la URL.
5. El justificante queda en estado pendiente de revision.

**Flujo — resolucion (Docente o Administrador):**
1. El docente accede a la seccion Justificantes y visualiza los pendientes de sus grupos.
2. Puede descargar o visualizar el archivo adjunto.
3. Si aprueba, el sistema actualiza la asistencia de ausente a justificado.
4. Si rechaza, ingresa una razon de rechazo que queda visible para el alumno.

**Resultado:** La asistencia queda en estado justificado o el alumno recibe la razon del rechazo.

---

### CU-07 Consulta de historial de asistencia

**Actor:** Alumno

**Descripcion:** El alumno puede revisar en cualquier momento su situacion de asistencia por materia.

**Flujo principal:**
1. El alumno accede a la seccion Mi Asistencia.
2. El sistema muestra una lista de sus materias inscritas con la tasa de asistencia calculada para cada una.
3. Cada materia muestra una barra de progreso con color segun el umbral: verde si esta en regla, amarillo en advertencia, naranja en riesgo y rojo en estado critico.
4. Al seleccionar una materia el alumno ve el detalle sesion por sesion con el estado de cada una.

**Resultado:** El alumno conoce su situacion actual y puede tomar acciones preventivas antes de reprobar por inasistencias.

---

### CU-08 Generacion de reportes

**Actor:** Administrador / Docente

**Descripcion:** Se puede exportar un reporte completo de asistencia de cualquier grupo-materia.

**Flujo principal:**
1. El usuario accede a la seccion Reportes y selecciona el grupo-materia del dropdown.
2. Elige el formato de exportacion: Excel o PDF.
3. El sistema genera el archivo y lo descarga automaticamente en el navegador.

**Contenido del reporte Excel:**
- Hoja Resumen: nombre de materia, grupo, docente y porcentaje promedio de asistencia del grupo.
- Hoja Detalle: una fila por alumno y una columna por sesion cerrada. Cada celda contiene P (presente), A (ausente) o J (justificado). La ultima columna muestra el porcentaje individual.

**Contenido del reporte PDF:**
- Cabecera con metadatos del grupo-materia.
- Tabla con el mismo detalle que la hoja Detalle del Excel.

**Resultado:** El docente o administrador obtiene un archivo descargable listo para entregar o archivar.

---

### CU-09 Configuracion de umbrales de asistencia

**Actor:** Administrador

**Descripcion:** El administrador puede ajustar los porcentajes minimos de asistencia que determinan el nivel de alerta de cada alumno.

**Flujo principal:**
1. El administrador accede a la seccion Configuracion.
2. Modifica los tres umbrales: advertencia, riesgo y critico.
3. El sistema valida que se cumpla la relacion critico < riesgo < advertencia y que ninguno supere 100.
4. Los nuevos umbrales se aplican a partir de la siguiente sesion que se cierre.

**Resultado:** El criterio de alerta queda ajustado a las politicas de la institucion.

---

### CU-10 Gestion de notificaciones

**Actor:** Cualquier usuario autenticado

**Descripcion:** El sistema mantiene a cada usuario informado sobre eventos relevantes mediante notificaciones en tiempo real.

**Flujo principal:**
1. El usuario accede a la plataforma y el cliente establece una conexion SSE con `/api/notifications/stream`.
2. El stream emite el conteo de notificaciones no leidas cada 5 segundos. El badge de la campana en el navbar se actualiza automaticamente.
3. Al hacer clic en la campana el usuario accede a la lista completa de notificaciones ordenadas por fecha.
4. Puede marcar notificaciones individuales o todas como leidas.

**Resultado:** El usuario esta informado de su situacion de asistencia sin necesidad de recargar la pagina.

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
