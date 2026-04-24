# CS Audio Baterías

Aplicación web para gestión de clientes, ventas, turnos y control de stock.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Base de datos

Variables esperadas:
- `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING` (si no tenés una “direct”, podés usar el mismo valor que `DATABASE_URL`)

En Vercel deben estar cargadas como Environment Variables (no se suben al repo).

## Códigos Aleatorios de Producto (3 caracteres)

Cada producto tiene un identificador `codigo_aleatorio` único (A-Z y 0-9, 3 caracteres) para:
- Buscar por scanner/teclado sin conocer el nombre.
- Re-etiquetar productos físicos y enlazarlos al sistema.

Endpoints:
- `GET /api/products/by-code/{COD}`
- `GET /api/products/codes`

Pruebas:
```bash
npm run test
```

