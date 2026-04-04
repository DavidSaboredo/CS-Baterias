import NewSaleForm from '@/app/components/NewSaleForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewSalePage() {
  console.log('Rendering NewSalePage at', new Date().toISOString())

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Venta</h1>
        <Link href="/sales" className="text-gray-600 hover:text-gray-900">
          &larr; Volver
        </Link>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="max-w-3xl mx-auto">
          <NewSaleForm />
        </div>
      </div>
    </div>
  )
}
