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

## Cambios recientes (Marzo 2026)

### 1) Compatibilidad visual de botones (Chrome/Firefox)

- Se unificaron estilos de botones primarios para evitar casos donde se veían "transparentes" en algunos navegadores.
- Se centralizó la lógica en una utilidad compartida para mantener consistencia visual entre formularios.

### 2) Nueva venta con buscador remoto de productos

- La pantalla de nueva venta ya no precarga todo el catálogo en un select gigante.
- Se agregó un combobox con búsqueda remota y paginación para mejorar rendimiento y UX.
- Se incorporó una ruta interna para búsqueda autenticada por sesión:
   - `GET /api/internal/products/search`

### 3) Importación masiva desde Excel con previsualización

- Nueva sección en Stock para importar productos desde `.xlsx`, `.xls` o `.csv`.
- Flujo de dos pasos:
   1. Previsualización (sin persistir): valida filas, marca errores y detecta duplicados.
   2. Confirmación: requiere contraseña admin y ejecuta persistencia en transacción.
- Comportamiento de negocio en importación:
   - Si el producto existe (marca + modelo + amperaje), actualiza precio y stock mínimo.
   - Si no existe, crea producto nuevo.
   - No rompe APIs públicas existentes.

### 4) Ajustes mobile y unificación del buscador en ventas

- Se corrigió el desborde en mobile en la pantalla de nueva venta (sección cliente), adaptando layout y ancho de botón para pantallas chicas.
- Se implementó el mismo buscador remoto de productos en la sección de ventas dentro del detalle de cliente.
- Resultado: experiencia consistente de búsqueda de productos tanto en `/sales/new` como en `/clients/:id`.

### Estado del contrato de integración e-commerce

Se mantuvo sin cambios en estructura/autenticación:

- `GET /api/public/products`
- `GET /api/public/products/:id`
- `POST /api/orders`

Nota sobre cantidad de productos visibles en la web e-commerce:

- La API pública ya devuelve metadatos de paginación (`meta.total`, `meta.totalPages`, `page`, `limit`).
- Si en la tienda se ven menos productos (por ejemplo 16), normalmente es por límite/paginación del lado consumidor (frontend e-commerce), no por truncamiento del backend de este proyecto.

### Validación smoke ejecutada

Se ejecutaron pruebas rápidas locales luego de estos cambios:

- Build de producción OK (`next build --webpack`).
- Test de descuentos OK (`tests/discount.test.js`).
- Verificación API pública:
   - `GET /api/public/products?available=true&limit=250` => `count: 50`, `total: 50`.
   - `GET /api/public/products?limit=100` => `count: 53`, `total: 53`.
   - `GET /api/public/products?available=true&limit=16` => `count: 16`, `total: 50`, `totalPages: 4`.

Conclusión: backend/API entrega el catálogo completo; la vista de 16 ítems depende de paginación/límite en el consumidor e-commerce.

## Cambios recientes (Abril 2026)

### 1) Buscador remoto de clientes en ventas

- En la creación de ventas se reemplazó el select masivo por un buscador remoto de clientes.
- Se incorporó la ruta interna autenticada:
   - `GET /api/internal/clients/search`
- Mejora de rendimiento: se evita precargar todos los clientes al entrar a la pantalla.

### 2) Taller con buscador remoto de ítems y flujo más flexible

- En Taller se reemplazó la selección pesada de productos por búsqueda remota reutilizable.
- Soporte para múltiples tipos de ítem en documentos:
   - productos de stock,
   - servicios,
   - ítems externos.

### 3) Documentos profesionales en PDF (Presupuesto / Orden / Recibo)

- Se agregó descarga directa de PDF desde Taller con estilo profesional y colores de marca.
- Se mejoró legibilidad y espaciado del encabezado para evitar solapes en fecha/validez.
- El PDF incluye encabezado comercial, tabla de ítems, total destacado, términos y firmas.

### 4) Envío por WhatsApp y acceso rápido desde clientes

- Se agregó acción de inicio de chat WhatsApp en flujo de documentos.
- Los teléfonos en listado y detalle de clientes son clickeables para abrir WhatsApp.

### 5) Normalización de teléfonos

- Se centralizó la lógica en utilidades compartidas:
   - `normalizePhoneForStorage()`
   - `toWhatsAppPhone()`
   - `getWhatsAppLink()`
- Se normaliza al guardar/editar cliente para mantener consistencia en toda la app.
- Se incluyó script de normalización masiva para datos existentes.

### 6) Garantía opcional por venta

- Se habilitó registrar ventas con garantía `0` (sin garantía).
- Formularios y reportes ajustados para mostrar y tratar correctamente este caso.

### 7) Compatibilidad y coherencia operativa

- Ajustes visuales de botones para evitar inconsistencias entre navegadores.
- Dashboard alineado con zona horaria `America/Argentina/Buenos_Aires`.

### 8) Validación final

- Compilación sin errores TypeScript en los módulos modificados.
- Rutas principales verificadas localmente en estado operativo.

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
