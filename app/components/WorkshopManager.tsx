'use client'

import { useState, useRef, useMemo } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Search, Plus, Trash2, FileText, Wrench, ClipboardList, User, Package, Zap } from 'lucide-react'

type Client = {
  id: number
  name: string
  phone: string | null
  licensePlate: string | null
}

type Product = {
  id: number
  brand: string
  model: string
  amperage: string
  price: number
  stock: number
}

type Service = {
  id: string
  description: string
  price: number
  quantity: number
  isService: true
}

type ProductItem = Product & {
  quantity: number
  isService?: false
}

type Item = ProductItem | Service

type DocumentType = 'budget' | 'order' | 'receipt'

const DOCUMENT_TYPES = {
  budget: { label: 'Presupuesto', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  order: { label: 'Orden de Servicios', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  receipt: { label: 'Recibo Final', icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
}

export default function WorkshopManager({ clients, products }: { clients: Client[], products: Product[] }) {
  const [docType, setDocType] = useState<DocumentType>('budget')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [items, setItems] = useState<Item[]>([])
  
  // Service form state
  const [serviceDesc, setServiceDesc] = useState('')
  const [servicePrice, setServicePrice] = useState('')

  // Product selection state
  const [selectedProductId, setSelectedProductId] = useState('')

  const componentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${docType}_${selectedClient?.name || 'cliente'}_${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: () => console.log('Printed successfully'),
  })

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return []
    const searchLower = clientSearch.toLowerCase()
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchLower) || 
      (c.licensePlate && c.licensePlate.toLowerCase().includes(searchLower))
    ).slice(0, 5)
  }, [clients, clientSearch])

  // Handlers
  const handleAddService = () => {
    if (!serviceDesc || !servicePrice) return
    const newItem: Service = {
      id: `svc-${Date.now()}`,
      description: serviceDesc,
      price: parseFloat(servicePrice),
      quantity: 1,
      isService: true
    }
    setItems([...items, newItem])
    setServiceDesc('')
    setServicePrice('')
  }

  const handleAddProduct = () => {
    if (!selectedProductId) return
    const product = products.find(p => p.id.toString() === selectedProductId)
    if (!product) return

    const existingItemIndex = items.findIndex(i => !i.isService && i.id === product.id)
    
    if (existingItemIndex >= 0) {
      const newItems = [...items]
      newItems[existingItemIndex].quantity += 1
      setItems(newItems)
    } else {
      const newItem: ProductItem = {
        ...product,
        quantity: 1,
        isService: false
      }
      setItems([...items, newItem])
    }
    setSelectedProductId('')
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT COLUMN: Controls */}
      <div className="space-y-6">
        
        {/* Document Type Selector */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipo de Documento</h2>
          <div className="flex rounded-lg bg-gray-100 p-1">
            {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((type) => {
              const config = DOCUMENT_TYPES[type]
              const isActive = docType === type
              const Icon = config.icon
              return (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                    isActive 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? config.color : ''}`} />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Client Selector */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Cliente</h2>
          {!selectedClient ? (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o patente..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              {filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client)
                        setClientSearch('')
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.licensePlate || 'Sin patente'}</p>
                      </div>
                      <User className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedClient.name}</p>
                  <p className="text-sm text-gray-500">{selectedClient.licensePlate || 'Sin patente'} • {selectedClient.phone || 'Sin teléfono'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-red-600 p-2"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Item Builder */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Agregar Ítems</h2>
          
          <div className="space-y-4">
            {/* Add Product from Stock */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Producto de Stock</label>
              <div className="flex gap-2 w-full">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.model} {p.amperage} - ${p.price} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddProduct}
                  disabled={!selectedProductId}
                  className="shrink-0 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">O agregar servicio</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Add Custom Service */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción del Servicio</label>
                <input
                  type="text"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Ej. Mano de obra, Instalación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddService}
                    disabled={!serviceDesc || !servicePrice}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Preview & Actions */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
          {/* Header */}
          <div className={`p-4 border-b ${DOCUMENT_TYPES[docType].border} ${DOCUMENT_TYPES[docType].bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = DOCUMENT_TYPES[docType].icon
                  return <Icon className={`w-5 h-5 ${DOCUMENT_TYPES[docType].color}`} />
                })()}
                <h2 className={`font-bold ${DOCUMENT_TYPES[docType].color}`}>{DOCUMENT_TYPES[docType].label}</h2>
              </div>
              <span suppressHydrationWarning className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 p-4 overflow-y-auto">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <ClipboardList className="w-12 h-12 mb-2" />
                <p>No hay ítems agregados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {item.isService ? <Zap className="w-4 h-4 text-orange-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                          <span className="font-medium text-gray-900">
                            {item.isService ? item.description : `${item.brand} ${item.model} ${item.amperage}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => removeItem(index)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Totals */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total Items</span>
              <span className="font-bold text-gray-900">{items.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-4 border-t border-gray-200">
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={() => handlePrint()}
              disabled={items.length === 0}
              className="w-full mt-6 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <Printer className="w-5 h-5" />
              Generar {DOCUMENT_TYPES[docType].label}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Printable Component */}
      <div className="hidden">
        <div ref={componentRef} className="p-8 bg-white text-gray-900 font-sans max-w-[210mm] mx-auto print:block">
          <style type="text/css" media="print">
            {`
              @page { size: A4; margin: 20mm; }
              body { -webkit-print-color-adjust: exact; }
            `}
          </style>
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
            <div>
              <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">{DOCUMENT_TYPES[docType].label.toUpperCase()}</h1>
              <p suppressHydrationWarning className="text-sm text-gray-500">Fecha: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-bold text-gray-900 text-lg">CS Audio & Baterías</p>
              <p>Dirección del Taller 123</p>
              <p>Tel: (123) 456-7890</p>
              <p>Email: contacto@csaudio.com</p>
            </div>
          </div>

          {/* Client Info */}
          {selectedClient && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Datos del Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre / Razón Social</p>
                  <p className="font-medium">{selectedClient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Patente / Vehículo</p>
                  <p className="font-medium">{selectedClient.licensePlate || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{selectedClient.phone || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 font-bold text-gray-700">Descripción</th>
                <th className="text-center py-2 font-bold text-gray-700">Cant.</th>
                <th className="text-right py-2 font-bold text-gray-700">Precio Unit.</th>
                <th className="text-right py-2 font-bold text-gray-700">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-3">
                    {item.isService ? item.description : `${item.brand} ${item.model} ${item.amperage}`}
                  </td>
                  <td className="text-center py-3">{item.quantity}</td>
                  <td className="text-right py-3">${item.price.toFixed(2)}</td>
                  <td className="text-right py-3 font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={3} className="pt-4 text-right font-bold text-lg">Total:</td>
                <td className="pt-4 text-right font-bold text-lg">${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Terms & Conditions */}
          <div className="mt-12 text-xs text-gray-500 border-t border-gray-200 pt-4">
            <h4 className="font-bold text-gray-700 mb-2">Términos y Condiciones de Garantía</h4>
            <p className="mb-1">1. Los trabajos realizados tienen una garantía de 30 días sobre la mano de obra.</p>
            <p className="mb-1">2. Las baterías nuevas cuentan con la garantía especificada por el fabricante (usualmente 12 meses).</p>
            <p className="mb-1">3. No se aceptan devoluciones de partes eléctricas una vez instaladas.</p>
            <p className="mb-1">4. El presupuesto tiene una validez de 15 días.</p>
            
            <div className="mt-12 flex justify-between items-end">
              <div className="border-t border-gray-400 w-48 text-center pt-2">
                Firma del Cliente
              </div>
              <div className="border-t border-gray-400 w-48 text-center pt-2">
                Firma Responsable
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
