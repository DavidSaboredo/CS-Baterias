import { prisma } from '@/lib/prisma'
import { addProduct } from '@/app/actions'
import DeleteProductForm from '@/app/components/DeleteProductForm'
import EditStockButton from '@/app/components/EditStockButton'
import AddProductForm from '@/app/components/AddProductForm'
import BulkPriceUpdateForm from '@/app/components/BulkPriceUpdateForm'
import BulkProductImportForm from '@/app/components/BulkProductImportForm'
import StockSearchForm from '@/app/components/StockSearchForm'

export const dynamic = 'force-dynamic'

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const products = await prisma.product.findMany({
    where: query
      ? {
          OR: [
            { brand: { contains: query, mode: 'insensitive' } },
            { model: { contains: query, mode: 'insensitive' } },
            { amperage: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [
      { updatedAt: 'desc' },
      { brand: 'asc' },
    ],
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Control de Stock</h1>

      <div className="space-y-8">
        {/* Formulario de Alta de Producto */}
        <div>
          <AddProductForm />
        </div>

        {/* Formulario de Importación Bulk */}
        <div>
          <BulkProductImportForm />
        </div>

        <div>
          <BulkPriceUpdateForm />
        </div>

        {/* Lista de Productos */}
        <div>
          <div className="mb-4">
            <StockSearchForm initialQuery={query} />
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Inventario ({products.length})
            </h2>
            {query && <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Filtro: "{query}"</span>}
          </div>

          <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amperaje</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {query ? 'No se encontraron productos con ese criterio.' : 'No hay productos registrados aún.'}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.brand}</div>
                          <div className="text-sm text-gray-500">{product.model}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.amperage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.stock <= product.minStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center gap-2">
                          <EditStockButton 
                            productId={product.id} 
                            productInfo={`${product.brand} ${product.model}`} 
                            currentStock={product.stock} 
                            currentPrice={product.price}
                            currentImageUrl={product.imageUrl}
                          />
                          <DeleteProductForm id={product.id} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
