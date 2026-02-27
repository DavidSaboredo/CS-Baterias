# Gestión de Clientes - CS Audio Baterías

Aplicación web para la gestión de clientes y control de stock.

## Tecnologías
- **Frontend**: React (Next.js 15)
- **Backend**: Next.js Server Actions
- **Base de Datos**: SQLite (vía Prisma)
- **Estilos**: Tailwind CSS

## Requisitos Previos
- Node.js 18+ instalado.

## Instalación
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Inicializar la base de datos:
   ```bash
   npx prisma migrate dev --name init
   ```

## Ejecución
Para iniciar el servidor de desarrollo:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

## Autenticación
El acceso está protegido. Las credenciales por defecto son:
- **Usuario**: `admin`
- **Contraseña**: `password`

(Configurable en el archivo `.env`)

## Funcionalidades
- **Alta de Clientes**: Nombre, Teléfono, Patente/Matrícula.
- **Listado de Clientes**: Vista rápida de todos los registrados.
- **Búsqueda**: Filtrado por nombre o patente.
- **Eliminar**: Borrado de clientes.
