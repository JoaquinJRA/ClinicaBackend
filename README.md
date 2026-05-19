# 🏥 Clínica Luz — Backend

API REST desarrollada con **Node.js**, **Express** y **Prisma ORM** para el sistema de gestión de la Clínica Luz.

---

## 📋 Requisitos previos

Asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/) v9 o superior
- Una base de datos PostgreSQL (local o en la nube)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd ClinicaBackend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto copiando el archivo de ejemplo:

```bash
cp .env.example .env
```

Luego edita `.env` con tus valores:

```env
# Base de datos — reemplaza con tu cadena de conexión
DATABASE_URL="postgresql://usuario:contrasena@localhost:5432/clinica_luz"

# JWT — pon una clave secreta larga y aleatoria
JWT_SECRET="tu_clave_secreta_muy_larga_aqui"

# Puerto del servidor (opcional, por defecto 3000)
PORT=3000
```

> ⚠️ **Nunca subas el archivo `.env` al repositorio.** Ya está incluido en el `.gitignore`.

---

## 🗄️ Configuración de la base de datos con Prisma

### 4. Generar el cliente de Prisma

Este paso genera el cliente tipado a partir del schema. **Debe ejecutarse siempre** después de clonar o al modificar el schema:

```bash
npx prisma generate
```

### 5. Ejecutar las migraciones

Aplica el schema a tu base de datos (crea las tablas):

```bash
npx prisma migrate dev --name init
```

> Si ya existen migraciones previas y solo quieres aplicarlas sin crear una nueva:
> ```bash
> npx prisma migrate deploy
> ```

### 6. Poblar la base de datos con datos iniciales (Seed)

Ejecuta el seed para insertar los roles base que el sistema necesita (`PACIENTE`, `MEDICO`, `ADMIN`):

```bash
npx prisma db seed
```

> Si el comando anterior no funciona, ejecuta directamente:
> ```bash
> node prisma/seed.js
> ```

---

## 🌱 Archivo de Seed

El seed se encuentra en `prisma/seed.js` y crea los roles necesarios para que el sistema funcione. Sin esto, el registro de usuarios fallará.

```js
// prisma/seed.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = ["PACIENTE", "MEDICO", "ADMIN"];

  for (const nombre of roles) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  console.log("✅ Roles creados correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Asegúrate de que tu `package.json` tenga configurado el seed:

```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

---

## ▶️ Levantar el servidor

### Modo desarrollo (con hot reload)

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

---

## 📁 Estructura del proyecto

```
ClinicaBackend/
├── prisma/
│   ├── schema.prisma       # Modelos de la base de datos
│   ├── seed.js             # Datos iniciales (roles)
│   └── client.js           # Instancia de PrismaClient
├── src/
│   ├── controllers/        # Lógica de entrada/salida HTTP
│   │   └── auth.controller.js
│   ├── services/           # Lógica de negocio
│   │   └── auth.service.js
│   ├── routes/             # Definición de rutas
│   │   └── auth.router.js
│   ├── middlewares/        # Middlewares globales
│   │   ├── auth.middleware.js   # verifySession, requireRole
│   │   └── error.middleware.js  # errorHandler
│   └── utils/
│       └── appError.js     # Clases de error personalizadas
├── .env                    # Variables de entorno (NO subir)
├── .env.example            # Plantilla de variables de entorno
├── package.json
└── server.js               # Punto de entrada
```

---

## 🔌 Endpoints disponibles

### Auth — `/api/auth`

| Método | Ruta        | Descripción                        | Protegida |
|--------|-------------|------------------------------------|-----------|
| POST   | `/register` | Registrar nuevo paciente           | No        |
| POST   | `/login`    | Iniciar sesión                     | No        |
| POST   | `/logout`   | Cerrar sesión                      | Sí        |
| GET    | `/profile`  | Obtener perfil del usuario activo  | Sí        |

### Ejemplo — Registro (`POST /api/auth/register`)

**Body (JSON):**
```json
{
  "nombre": "Carlos",
  "apellido": "García",
  "email": "carlos@ejemplo.com",
  "contrasena": "miContrasena123",
  "dni": "12345678",
  "telefono": "+51999999999",
  "direccion": "Av. Luz 123, Lima",
  "fechaNacimiento": "1995-06-15",
  "genero": "MASCULINO"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado correctamente.",
  "usuario": {
    "id": 1,
    "nombre": "Carlos",
    "apellido": "García",
    "email": "carlos@ejemplo.com",
    "rol": "PACIENTE"
  }
}
```

### Ejemplo — Login (`POST /api/auth/login`)

**Body (JSON):**
```json
{
  "email": "carlos@ejemplo.com",
  "contrasena": "miContrasena123"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Inicio de sesión exitoso.",
  "usuario": {
    "id": 1,
    "nombre": "Carlos",
    "apellido": "García",
    "email": "carlos@ejemplo.com",
    "rol": "PACIENTE"
  }
}
```

> La sesión se maneja mediante una **cookie `httpOnly`** llamada `token`. No es necesario manejar el token manualmente en el cliente.

---

## 🛡️ Autenticación y roles

El sistema usa **JWT almacenado en cookie httpOnly**. Los middlewares disponibles son:

- `verifySession` — verifica que el usuario tenga una sesión activa.
- `requireRole("ADMIN")` — verifica que el usuario tenga el rol requerido.

**Valores válidos para `genero`:** `MASCULINO`, `FEMENINO`, `OTRO`

**Roles del sistema:** `PACIENTE`, `MEDICO`, `ADMIN`

---

## 🗃️ Comandos de Prisma útiles

```bash
# Ver el estado de las migraciones
npx prisma migrate status

# Abrir Prisma Studio (interfaz visual de la BD)
npx prisma studio

# Resetear la base de datos (⚠️ borra todos los datos)
npx prisma migrate reset

# Regenerar el cliente tras cambios en el schema
npx prisma generate
```

---

## ❗ Problemas frecuentes

**`Cannot read properties of undefined (reading 'findUnique')`**
→ El cliente de Prisma no se generó. Ejecuta `npx prisma generate`.

**`No existe el rol PACIENTE en la base de datos`**
→ No se ejecutó el seed. Ejecuta `npx prisma db seed`.

**`Error al conectar con la base de datos`**
→ Verifica que `DATABASE_URL` en tu `.env` sea correcto y que la base de datos esté corriendo.

**`JWT_SECRET is not defined`**
→ Falta la variable `JWT_SECRET` en el `.env`.