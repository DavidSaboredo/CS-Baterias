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

## API de Stock

La aplicación expone una API REST de solo lectura para consumir el stock desde otra web.

### Endpoints

- `GET /api/public/products`: listado paginado de productos.
- `GET /api/public/products/:id`: detalle de un producto.
- `POST /api/orders`: crea pedido, descuenta stock real y registra ventas.

### Query params disponibles

- `search`: busca por marca, modelo o amperaje.
- `available=true`: devuelve solo productos con stock mayor a 0.
- `page`: página actual. Default `1`.
- `limit`: cantidad por página. Default `100`, máximo `250`.

### Campos de imagen en productos

Los endpoints de productos incluyen `imageUrl` (opcional). Esta web no muestra la imagen, pero queda disponible para que la web publica la renderice.

### Carga y actualización de imágenes

- Al crear un producto, podés cargar imagen por URL o archivo/foto desde celular.
- En productos existentes (pantalla de stock, botón editar), podés:
   - reemplazar imagen,
   - cargar una nueva si no tenía,
   - quitar imagen actual.
- La imagen queda guardada en `imageUrl` y se expone por la API de stock.

### Seguridad opcional

Si definís `STOCK_API_KEY`, la API exigirá una clave en alguno de estos headers:

- `x-api-key: TU_CLAVE`
- `Authorization: Bearer TU_CLAVE`

### CORS

Podés limitar los orígenes permitidos con `STOCK_API_ALLOWED_ORIGINS`, separando múltiples dominios por coma.

Ejemplo:

```env
STOCK_API_KEY=tu_clave_segura
STOCK_API_ALLOWED_ORIGINS=https://tienda.tudominio.com,https://admin.tudominio.com
```

### Ejemplos de consumo

```bash
curl "http://localhost:3000/api/public/products?available=true&search=moura" \
   -H "x-api-key: tu_clave_segura"
```

```bash
curl "http://localhost:3000/api/public/products/1" \
   -H "Authorization: Bearer tu_clave_segura"
```

### Crear pedido y descontar stock

El endpoint `POST /api/orders` valida stock, descuenta en base de datos y registra una venta por unidad dentro de una transaccion.

Ejemplo:

```bash
curl -X POST "http://localhost:3000/api/orders" \
   -H "Content-Type: application/json" \
   -H "x-api-key: tu_clave_segura" \
   -d '{
      "customer": {
         "name": "Juan Perez",
         "phone": "3442462463",
         "zone": "Gualeguaychu",
         "delivery": "Retiro en local",
         "notes": "Cliente web"
      },
      "items": [
         { "productId": 51, "quantity": 2 },
         { "productId": 63, "quantity": 1 }
      ]
   }'
```

Si falta stock, responde `409` con `code: INSUFFICIENT_STOCK` y detalle de productos afectados.

## Base de datos en Vercel

Si tu base ya esta en Vercel Postgres, para trabajar local sin errores de `localhost:5432`:

1. Trae las variables del proyecto:

```bash
npx vercel env pull .env.local
```

2. Verifica que exista al menos una de estas variables:

- `DATABASE_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`

3. Reinicia el servidor dev:

```bash
npx next dev --webpack
```

Nota: el proyecto ya normaliza automaticamente `POSTGRES_*` a `DATABASE_URL` en runtime para Prisma.
