'use client'

import { useState, useRef, useMemo } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Search, Plus, Trash2, FileText, Wrench, ClipboardList, User, Package, Zap, MessageCircle, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { toWhatsAppPhone } from '@/lib/phone-utils'
import ProductSearchCombo, { type Product as SearchProduct } from './ProductSearchCombo'

type Client = {
  id: number
  name: string
  phone: string | null
  licensePlate: string | null
}

type Service = {
  id: string
  description: string
  price: number
  quantity: number
  isService: true
}

type ExternalItem = {
  id: string
  description: string
  price: number
  quantity: number
  isExternal: true
}

type ProductItem = SearchProduct & {
  quantity: number
  isService?: false
  isExternal?: false
}

type Item = ProductItem | Service | ExternalItem

type DocumentType = 'budget' | 'order' | 'receipt'

const DOCUMENT_TYPES = {
  budget: { label: 'Presupuesto', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  order: { label: 'Orden de Servicios', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  receipt: { label: 'Recibo Final', icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
}

export default function WorkshopManager({ clients }: { clients: Client[] }) {
  const [docType, setDocType] = useState<DocumentType>('budget')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [items, setItems] = useState<Item[]>([])
  
  // Service form state
  const [serviceDesc, setServiceDesc] = useState('')
  const [servicePrice, setServicePrice] = useState('')

  // External item form state (supplier / out-of-stock)
  const [externalDesc, setExternalDesc] = useState('')
  const [externalPrice, setExternalPrice] = useState('')
  const [externalQty, setExternalQty] = useState('1')

  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null)
  const [stockQty, setStockQty] = useState('1')

  const componentRef = useRef<HTMLDivElement>(null)

  const contactInfo = {
    businessName: 'CS Audio & Baterías',
    address: 'Galarza 1279',
    phone: '3442-461830',
  }

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${docType}_${selectedClient?.name || 'cliente'}_${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: () => console.log('Printed successfully'),
  })

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return []
    const searchLower = clientSearch.toLowerCase()
    return clients
      .filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          (client.licensePlate && client.licensePlate.toLowerCase().includes(searchLower))
      )
      .slice(0, 5)
  }, [clients, clientSearch])

  const handleShareDocument = () => {
    const phone = toWhatsAppPhone(selectedClient?.phone)

    if (!selectedClient) {
      alert('Selecciona un cliente para iniciar el chat de WhatsApp.')
      return
    }

    if (!phone) {
      alert('El cliente no tiene un teléfono válido para WhatsApp.')
      return
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}`

    // Open in a new tab without relying on return value, since some browsers
    // return null when noopener/noreferrer is used even if the tab opens.
    const anchor = document.createElement('a')
    anchor.href = whatsappUrl
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const handleDownloadPdfDocument = async () => {
    if (items.length === 0) return

    const rawBaseName = `${docType}_${selectedClient?.name || 'cliente'}_${new Date().toISOString().split('T')[0]}`
    const baseName = rawBaseName.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_')
    const fileName = `${baseName}.pdf`

    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPosition = 10

      // Colores de marca
      const redColor = [192, 39, 45] // #C0272D
      const blackColor = [30, 30, 30] // #1E1E1E
      const lightGray = [245, 245, 245]
      const borderGray = [232, 232, 232]
      const headerTopY = yPosition

      // ENCABEZADO - Izquierda: Nombre empresa + contacto
      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.setTextColor(...redColor)
      pdf.text(contactInfo.businessName, 15, headerTopY)

      yPosition = headerTopY + 8

      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(107, 107, 107)
      pdf.text(contactInfo.address, 15, yPosition)

      yPosition += 5
      pdf.text(`Tel: ${contactInfo.phone}`, 15, yPosition)

      // Badge tipo documento (derecha)
      const badgeY = headerTopY + 2
      pdf.setFillColor(...redColor)
      pdf.rect(pageWidth - 70, badgeY, 55, 10, 'F')
      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(255, 255, 255)
      pdf.text(DOCUMENT_TYPES[docType].label.toUpperCase(), pageWidth - 42.5, badgeY + 6.5, { align: 'center' })

      // Línea roja separadora
      const redLineY = headerTopY + 19
      pdf.setDrawColor(...redColor)
      pdf.setLineWidth(1.5)
      pdf.line(15, redLineY, pageWidth - 15, redLineY)

      // Fecha y validez (derecha, debajo de la línea roja)
      yPosition = redLineY + 6
      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...blackColor)
      const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      pdf.text(`Fecha: ${today}`, pageWidth - 15, yPosition, { align: 'right' })

      yPosition += 4
      pdf.text('Validez: 15 días', pageWidth - 15, yPosition, { align: 'right' })

      yPosition += 8

      // BLOQUE CLIENTE
      if (selectedClient) {
        pdf.setFillColor(...lightGray)
        pdf.rect(15, yPosition, pageWidth - 30, 10, 'F')
        pdf.setDrawColor(...redColor)
        pdf.setLineWidth(2.5)
        pdf.line(15, yPosition, 15, yPosition + 10)

        pdf.setFont('Helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(...redColor)
        pdf.text('CLIENTE:', 18, yPosition + 3.5)

        pdf.setFont('Helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(...blackColor)
        pdf.text(selectedClient.name, 38, yPosition + 3.5)

        if (selectedClient.licensePlate) {
          pdf.setFont('Helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(102, 102, 102)
          pdf.text(`Patente: ${selectedClient.licensePlate}`, 18, yPosition + 7)
        }
      }

      yPosition += 14

      // TABLA DE ÍTEMS
      const tableStartY = yPosition
      const rowHeight = 7

      // Encabezado tabla
      pdf.setFillColor(...blackColor)
      pdf.rect(15, tableStartY, pageWidth - 30, rowHeight, 'F')

      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(255, 255, 255)
      pdf.text('DESCRIPCIÓN', 18, tableStartY + 4.5)
      pdf.text('CANT.', 98, tableStartY + 4.5, { align: 'center' })
      pdf.text('P. UNIT.', 123, tableStartY + 4.5, { align: 'right' })
      pdf.text('SUBTOTAL', 168, tableStartY + 4.5, { align: 'right' })

      yPosition = tableStartY + rowHeight

      // Filas de datos
      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(9)
      items.forEach((item, index) => {
        // Fondo alternado
        if (index % 2 === 0) {
          pdf.setFillColor(248, 248, 248)
          pdf.rect(15, yPosition, pageWidth - 30, rowHeight, 'F')
        }

        pdf.setTextColor(...blackColor)
        const desc = getItemDescription(item)
        const lines = pdf.splitTextToSize(desc, 72)
        const lineCount = lines.length

        if (lineCount > 1) {
          pdf.text(lines[0], 18, yPosition + 3)
          for (let i = 1; i < lineCount; i++) {
            yPosition += 3.5
            if (yPosition + 3.5 < tableStartY + rowHeight + lineCount * 3.5) {
              pdf.text(lines[i], 18, yPosition + 3)
            }
          }
          yPosition += rowHeight
        } else {
          pdf.text(desc, 18, yPosition + 4.5)
          yPosition += rowHeight
        }

        pdf.setTextColor(...blackColor)
        pdf.text(item.quantity.toString(), 98, yPosition - rowHeight / 2 + 1.5, { align: 'center' })
        pdf.text(`$${item.price.toFixed(2)}`, 123, yPosition - rowHeight / 2 + 1.5, { align: 'right' })
        pdf.text(`$${(item.price * item.quantity).toFixed(2)}`, 168, yPosition - rowHeight / 2 + 1.5, { align: 'right' })

      })

      yPosition += 2

      // Línea separadora
      pdf.setDrawColor(...redColor)
      pdf.setLineWidth(0.8)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)

      yPosition += 4

      // Totales
      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(102, 102, 102)
      pdf.text('Total ítems:', 130, yPosition)
      pdf.setTextColor(...blackColor)
      pdf.setFont('Helvetica', 'bold')
      pdf.text(items.reduce((a, i) => a + i.quantity, 0).toString(), 168, yPosition, { align: 'right' })

      yPosition += 5
      pdf.setFont('Helvetica', 'normal')
      pdf.setTextColor(102, 102, 102)
      pdf.text('Subtotal:', 130, yPosition)
      pdf.setTextColor(...blackColor)
      pdf.setFont('Helvetica', 'bold')
      pdf.text(`$${total.toFixed(2)}`, 168, yPosition, { align: 'right' })

      yPosition += 7

      // TOTAL DESTACADO
      pdf.setFillColor(...redColor)
      pdf.rect(15, yPosition, pageWidth - 30, 12, 'F')
      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(255, 255, 255)
      pdf.text('TOTAL', 20, yPosition + 6)
      pdf.text(`$${total.toFixed(2)}`, pageWidth - 20, yPosition + 6, { align: 'right' })

      yPosition += 16

      // TÉRMINOS Y CONDICIONES
      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(...redColor)
      pdf.text('TÉRMINOS Y CONDICIONES DE GARANTÍA', 16, yPosition)

      yPosition += 3.5
      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(102, 102, 102)

      const terms = [
        '1. Los trabajos realizados tienen una garantía de 30 días sobre la mano de obra.',
        '2. Las baterías nuevas cuentan con la garantía del fabricante (usualmente 12 meses).',
        '3. No se aceptan devoluciones de partes eléctricas una vez instaladas.',
        '4. El presupuesto tiene una validez de 15 días desde la emisión.',
      ]

      terms.forEach((term) => {
        const lines = pdf.splitTextToSize(term, pageWidth - 32)
        lines.forEach((line: string) => {
          pdf.text(line, 16, yPosition)
           yPosition += 2.8
        })
      })

      yPosition += 5

      // FIRMAS
      const signatureY = yPosition
      const leftX = 20
      const rightX = 110

      pdf.setLineWidth(0.6)
      pdf.setDrawColor(153, 153, 153)
      pdf.line(leftX, signatureY + 30, leftX + 45, signatureY + 30)
      pdf.line(rightX, signatureY + 30, rightX + 45, signatureY + 30)

      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...blackColor)
      pdf.text('Firma del Cliente', leftX + 22.5, signatureY + 34, { align: 'center' })

      pdf.setFont('Helvetica', 'bold')
      pdf.text('Firma Responsable', rightX + 22.5, signatureY + 34, { align: 'center' })

      pdf.setFont('Helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(...redColor)
      pdf.text(contactInfo.businessName, rightX + 22.5, signatureY + 39, { align: 'center' })

      pdf.save(fileName)
      alert('PDF descargado correctamente.')
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar PDF. Por favor intenta nuevamente.')
    }
  }

  const handleAddService = () => {
    if (!serviceDesc || !servicePrice) return

    const newItem: Service = {
      id: `svc-${Date.now()}`,
      description: serviceDesc,
      price: Number.parseFloat(servicePrice),
      quantity: 1,
      isService: true,
    }

    setItems([...items, newItem])
    setServiceDesc('')
    setServicePrice('')
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const qty = Math.max(1, Number.parseInt(stockQty || '1', 10) || 1)
    const existingItemIndex = items.findIndex((item) => !item.isService && !item.isExternal && item.id === selectedProduct.id)

    if (existingItemIndex >= 0) {
      const newItems = [...items]
      newItems[existingItemIndex].quantity += qty
      setItems(newItems)
    } else {
      const newItem: ProductItem = {
        ...selectedProduct,
        quantity: qty,
        isService: false,
      }
      setItems([...items, newItem])
    }

    setSelectedProduct(null)
    setStockQty('1')
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleAddExternalItem = () => {
    if (!externalDesc || !externalPrice) return

    const normalizedDesc = externalDesc.trim()
    const parsedPrice = Number.parseFloat(externalPrice)
    const qty = Math.max(1, Number.parseInt(externalQty || '1', 10) || 1)

    if (!normalizedDesc || Number.isNaN(parsedPrice) || parsedPrice <= 0) return

    const existingExternalIndex = items.findIndex(
      (item) =>
        item.isExternal &&
        item.description.toLowerCase() === normalizedDesc.toLowerCase() &&
        item.price === parsedPrice
    )

    if (existingExternalIndex >= 0) {
      const newItems = [...items]
      newItems[existingExternalIndex].quantity += qty
      setItems(newItems)
      setExternalDesc('')
      setExternalPrice('')
      setExternalQty('1')
      return
    }

    const newItem: ExternalItem = {
      id: `ext-${Date.now()}`,
      description: normalizedDesc,
      price: parsedPrice,
      quantity: qty,
      isExternal: true,
    }

    setItems([...items, newItem])
    setExternalDesc('')
    setExternalPrice('')
    setExternalQty('1')
  }

  const selectedClientWhatsAppPhone = toWhatsAppPhone(selectedClient?.phone)
  const canOpenWhatsAppChat = Boolean(selectedClient && selectedClientWhatsAppPhone)
  const canGenerateDocument = items.length > 0

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const getItemDescription = (item: Item) => {
    if (item.isService || item.isExternal) {
      return item.description
    }

    return `${item.brand} ${item.model} ${item.amperage}`
  }

  const buildShareText = () => {
    const header = [
      contactInfo.businessName,
      DOCUMENT_TYPES[docType].label.toUpperCase(),
      `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
      `Dirección: ${contactInfo.address}`,
      `Tel: ${contactInfo.phone}`,
    ]

    const clientInfo = selectedClient
      ? [
          `Cliente: ${selectedClient.name}`,
          `Patente: ${selectedClient.licensePlate || '-'}`,
          `Tel. cliente: ${selectedClient.phone || '-'}`,
        ]
      : []

    const itemLines = items.map((item, index) => {
      const description = getItemDescription(item)

      return `${index + 1}. ${description} | Cant: ${item.quantity} | Unit: $${item.price.toFixed(2)} | Subtotal: $${(item.price * item.quantity).toFixed(2)}`
    })

    return [
      ...header,
      '',
      ...clientInfo,
      ...(clientInfo.length ? [''] : []),
      'Ítems:',
      ...itemLines,
      '',
      `TOTAL: $${total.toFixed(2)}`,
    ].join('\n')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
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
            <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                  {selectedClient.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{selectedClient.name}</p>
                  <p className="text-sm text-gray-500 truncate">{selectedClient.licensePlate || 'Sin patente'} • {selectedClient.phone || 'Sin teléfono'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-red-600 p-2 shrink-0"
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 w-full">
                <div className="min-w-0">
                  <ProductSearchCombo
                    onSelect={setSelectedProduct}
                    onUnselect={() => setSelectedProduct(null)}
                    selectedProduct={selectedProduct}
                    showStock={true}
                  />
                </div>
                <div className="w-full sm:w-24 self-end">
                  <input
                    type="number"
                    min={1}
                    aria-label="Cantidad"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedProduct}
                    className="w-full sm:w-auto h-10 inline-flex items-center justify-center rounded-lg border border-transparent bg-gray-900 px-4 py-2 text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-2 sm:mx-4 text-gray-400 text-[10px] sm:text-xs uppercase text-center">O agregar artículo externo</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Add External Item (not from stock) */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Artículo fuera de stock / proveedor</label>
                <input
                  type="text"
                  value={externalDesc}
                  onChange={(e) => setExternalDesc(e.target.value)}
                  placeholder="Ej. Batería XYZ proveedor ABC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={externalPrice}
                      onChange={(e) => setExternalPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cant.</label>
                  <input
                    type="number"
                    min={1}
                    value={externalQty}
                    onChange={(e) => setExternalQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddExternalItem}
                    disabled={!externalDesc || !externalPrice}
                    className="w-full sm:w-auto h-10 sm:h-auto inline-flex items-center justify-center rounded-lg border border-transparent bg-gray-900 px-4 py-2 text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-2 sm:mx-4 text-gray-400 text-[10px] sm:text-xs uppercase text-center">O agregar servicio</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
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
                    type="button"
                    onClick={handleAddService}
                    disabled={!serviceDesc || !servicePrice}
                    className="w-full sm:w-auto h-10 sm:h-auto inline-flex items-center justify-center rounded-lg border border-transparent bg-gray-900 px-4 py-2 text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
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
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isService ? <Zap className="w-4 h-4 text-orange-500 shrink-0" /> : <Package className={`w-4 h-4 shrink-0 ${item.isExternal ? 'text-purple-500' : 'text-blue-500'}`} />}
                            <span className="font-medium text-gray-900 break-words">
                              {getItemDescription(item)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-600 whitespace-nowrap">${item.price.toFixed(2)}</td>
                        <td className="py-3 text-right font-medium text-gray-900 whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <button 
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-gray-400 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleShareDocument}
                disabled={!canOpenWhatsAppChat}
                className="w-full border border-gray-300 bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Iniciar chat
              </button>

              <button
                type="button"
                onClick={handleDownloadPdfDocument}
                disabled={!canGenerateDocument}
                className="w-full border border-gray-300 bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Descargar PDF
              </button>

              <button
                type="button"
                onClick={() => handlePrint()}
                disabled={!canGenerateDocument}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Printer className="w-5 h-5" />
                Generar {DOCUMENT_TYPES[docType].label}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Component — optimized for html2canvas capture */}
      <div className="hidden">
        <div ref={componentRef} className="bg-white" style={{ width: '210mm', padding: '20mm', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1E1E1E', fontSize: '11px' }}>
          {/* ENCABEZADO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '3px solid #C0272D', paddingBottom: '12px' }}>
            {/* Izquierda: Nombre empresa + contacto */}
            <div style={{ flex: '0.6' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#C0272D', margin: '0 0 6px 0' }}>
                {contactInfo.businessName}
              </h1>
              <p style={{ margin: '2px 0', fontSize: '10px', color: '#6B6B6B' }}>
                {contactInfo.address}
              </p>
              <p style={{ margin: '2px 0', fontSize: '10px', color: '#6B6B6B' }}>
                Tel: {contactInfo.phone}
              </p>
            </div>

            {/* Derecha: Badge tipo doc + fecha */}
            <div style={{ flex: '0.4', textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#C0272D', color: 'white', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                {DOCUMENT_TYPES[docType].label.toUpperCase()}
              </div>
              <p style={{ margin: '4px 0', fontSize: '9px' }}>
                <strong>Fecha:</strong> {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <p style={{ margin: '4px 0', fontSize: '9px' }}>
                <strong>Validez:</strong> 15 días
              </p>
            </div>
          </div>

          {/* BLOQUE CLIENTE */}
          {selectedClient && (
            <div style={{ backgroundColor: '#F5F5F5', border: '2px solid #C0272D', borderLeft: '6px solid #C0272D', padding: '8px 12px', marginBottom: '16px', borderRadius: '2px' }}>
              <span style={{ fontWeight: 'bold', color: '#C0272D', fontSize: '9px' }}>CLIENTE:</span>
              <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '8px', color: '#1E1E1E' }}>
                {selectedClient.name}
              </span>
              {selectedClient.licensePlate && (
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#666' }}>
                  Patente: {selectedClient.licensePlate}
                </p>
              )}
            </div>
          )}

          {/* TABLA DE ÍTEMS */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E1E1E', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold', borderLeft: '6px solid #C0272D' }}>DESCRIPCIÓN</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>CANT.</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', width: '80px' }}>P. UNIT.</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', width: '90px' }}>SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F8F8F8', borderBottom: '1px solid #E8E8E8' }}>
                  <td style={{ padding: '8px', textAlign: 'left' }}>
                    {getItemDescription(item)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>
                    ${item.price.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#1E1E1E' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALES */}
          <div style={{ marginBottom: '16px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #C0272D', paddingTop: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Total ítems:</span>
              <span style={{ fontWeight: 'bold' }}>
                {items.reduce((a, i) => a + i.quantity, 0)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #E8E8E8' }}>
              <span style={{ color: '#666' }}>Subtotal:</span>
              <span style={{ fontWeight: 'bold' }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* TOTAL DESTACADO */}
          <div style={{ backgroundColor: '#C0272D', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderRadius: '2px', fontSize: '14px', fontWeight: 'bold' }}>
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {/* TÉRMINOS Y CONDICIONES */}
          <div style={{ fontSize: '8px', color: '#666', backgroundColor: '#F9F9F9', border: '1px solid #C0272D', padding: '10px', marginBottom: '20px', borderRadius: '2px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#C0272D', marginTop: 0, marginBottom: '6px', fontSize: '9px' }}>
              TÉRMINOS Y CONDICIONES DE GARANTÍA
            </h4>
            <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.4' }}>
              <li style={{ marginBottom: '3px' }}>Los trabajos realizados tienen una garantía de 30 días sobre la mano de obra.</li>
              <li style={{ marginBottom: '3px' }}>Las baterías nuevas cuentan con la garantía del fabricante (usualmente 12 meses).</li>
              <li style={{ marginBottom: '3px' }}>No se aceptan devoluciones de partes eléctricas una vez instaladas.</li>
              <li>El presupuesto tiene una validez de 15 días desde la emisión.</li>
            </ol>
          </div>

          {/* FIRMAS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '10px', textAlign: 'center' }}>
            <div style={{ flex: 1, marginRight: '20px' }}>
              <div style={{ borderTop: '1px solid #999', height: '50px', marginBottom: '4px' }}></div>
              <span>Firma del Cliente</span>
            </div>
            <div style={{ flex: 1, marginLeft: '20px' }}>
              <div style={{ borderTop: '1px solid #999', height: '50px', marginBottom: '4px' }}></div>
              <span style={{ fontWeight: 'bold' }}>Firma Responsable</span>
              <p style={{ margin: '4px 0 0 0', color: '#C0272D', fontWeight: 'bold', fontSize: '9px' }}>
                {contactInfo.businessName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
