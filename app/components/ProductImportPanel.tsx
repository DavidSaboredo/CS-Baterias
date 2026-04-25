'use client';

import { useMemo, useRef, useState } from 'react';
import { getPrimaryButtonClasses, getSecondaryButtonClasses } from '@/lib/button-styles';
import { jsPDF } from 'jspdf';

type ProductForExport = {
  codigoAleatorio: string
  brand: string
  model: string
  amperage: string
  stock: number
  minStock: number
  price: number
}

export default function ProductImportPanel({ productsForExport }: { productsForExport?: ProductForExport[] }) {
  const [tab, setTab] = useState<'csv' | 'image'>('csv');
  const [mode, setMode] = useState<'upsert' | 'prices' | 'stock'>('upsert');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [adjustPercent, setAdjustPercent] = useState('');
  const [adjustPassword, setAdjustPassword] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const downloadPdf = (pdf: jsPDF, fileName: string) => {
    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent)
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)

    if (isIOS) {
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      return
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const example = useMemo(() => {
    return [
      'brand,model,amperage,stock,minStock,price',
      'Moura,M20GD,65Ah,5,2,1000',
      'Varta,Blue Dynamic,60Ah,3,2,1200',
    ].join('\n');
  }, []);

  const exportStockPdf = async () => {
    if (!productsForExport || productsForExport.length === 0) {
      setMessage('No hay productos para exportar.')
      return
    }

    try {
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const marginX = 10
      const marginTop = 12
      const marginBottom = 12

      const now = new Date()
      const dateLabel = now.toLocaleString('es-AR')
      const rawFileName = `backup_stock_${now.toISOString().slice(0, 10)}.pdf`
      const fileName = rawFileName.replace(/[\\/:*?"<>|]+/g, '_')

      const col = {
        code: marginX,
        product: marginX + 26,
        amp: marginX + 120,
        stock: marginX + 150,
        min: marginX + 166,
        price: marginX + 184,
      }

      const headerRowHeight = 7
      const rowHeight = 6

      const drawHeader = () => {
        pdf.setFont('Helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(20, 20, 20)
        pdf.text('Backup de Stock', marginX, marginTop)

        pdf.setFont('Helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(90, 90, 90)
        pdf.text(`Exportado: ${dateLabel}`, pageWidth - marginX, marginTop, { align: 'right' })

        const y = marginTop + 6
        pdf.setFillColor(30, 30, 30)
        pdf.rect(marginX, y, pageWidth - marginX * 2, headerRowHeight, 'F')

        pdf.setFont('Helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(255, 255, 255)
        pdf.text('COD', col.code, y + 4.5)
        pdf.text('PRODUCTO', col.product, y + 4.5)
        pdf.text('AMP', col.amp, y + 4.5)
        pdf.text('STK', col.stock, y + 4.5, { align: 'right' })
        pdf.text('MIN', col.min, y + 4.5, { align: 'right' })
        pdf.text('PRECIO', col.price, y + 4.5, { align: 'right' })

        return y + headerRowHeight
      }

      let y = drawHeader() + 2

      pdf.setFont('Helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(20, 20, 20)

      const rows = [...productsForExport].sort((a, b) => {
        const aName = `${a.brand} ${a.model}`.toLowerCase()
        const bName = `${b.brand} ${b.model}`.toLowerCase()
        return aName.localeCompare(bName)
      })

      for (let i = 0; i < rows.length; i += 1) {
        const p = rows[i]
        const willOverflow = y + rowHeight > pageHeight - marginBottom
        if (willOverflow) {
          pdf.addPage()
          y = drawHeader() + 2
          pdf.setFont('Helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(20, 20, 20)
        }

        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248)
          pdf.rect(marginX, y - 4.2, pageWidth - marginX * 2, rowHeight, 'F')
        }

        const productLabel = `${p.brand} ${p.model}`
        const productLines = pdf.splitTextToSize(productLabel, col.amp - col.product - 2)
        const productText = Array.isArray(productLines) && productLines.length > 0 ? String(productLines[0]) : productLabel

        pdf.text(String(p.codigoAleatorio || '').toUpperCase(), col.code, y)
        pdf.text(productText, col.product, y)
        pdf.text(String(p.amperage || ''), col.amp, y)
        pdf.text(String(p.stock ?? 0), col.stock, y, { align: 'right' })
        pdf.text(String(p.minStock ?? 0), col.min, y, { align: 'right' })
        pdf.text(`$${Number(p.price ?? 0).toFixed(2)}`, col.price, y, { align: 'right' })

        y += rowHeight
      }

      downloadPdf(pdf, fileName)
      setMessage(`PDF generado: ${fileName}`)
    } catch {
      setMessage('No se pudo generar el PDF.')
    }
  }

  async function uploadCsv(file: File) {
    setIsUploading(true);
    setMessage(null);
    setErrors([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      const res = await fetch('/api/products/import', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setMessage('No autorizado. Iniciá sesión para importar.');
          return;
        }
        setMessage(body?.error || 'No se pudo importar.');
        return;
      }
      const created = body?.created ?? 0;
      const updated = body?.updated ?? 0;
      const errorsCount = body?.errorsCount ?? 0;
      const usedMode = body?.mode || mode;
      const modeLabel =
        usedMode === 'prices' ? 'precios' : usedMode === 'stock' ? 'stock' : 'productos';
      setMessage(`Importación (${modeLabel}) OK. Creados: ${created}. Actualizados: ${updated}. Errores: ${errorsCount}.`);
      setErrors((body?.errors || []) as Array<{ row: number; error: string }>);
    } catch {
      setMessage('Error de conexión.');
    } finally {
      setIsUploading(false);
    }
  }

  async function applyAdjustment() {
    const percent = Number((adjustPercent || '').replace(',', '.'));
    if (!Number.isFinite(percent) || percent === 0) {
      setMessage('Porcentaje inválido.');
      return;
    }
    if (!adjustPassword) {
      setMessage('Ingresá la contraseña de administrador.');
      return;
    }

    setIsAdjusting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/products/prices/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ percent, password: adjustPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body?.error || 'No se pudo aplicar el ajuste.');
        return;
      }
      setMessage(`Ajuste aplicado (${percent > 0 ? '+' : ''}${percent}%).`);
      setAdjustPassword('');
    } catch {
      setMessage('Error de conexión.');
    } finally {
      setIsAdjusting(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Cargas Masivas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportStockPdf}
            disabled={!productsForExport || productsForExport.length === 0}
            className={getSecondaryButtonClasses({ fullWidth: false, size: 'sm', disabled: !productsForExport || productsForExport.length === 0 })}
          >
            Exportar stock (PDF)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('csv');
              requestAnimationFrame(() => csvFileInputRef.current?.click());
            }}
            className={
              tab === 'csv'
                ? getPrimaryButtonClasses({ color: 'gray', fullWidth: false, size: 'sm' })
                : getSecondaryButtonClasses({ fullWidth: false, size: 'sm' })
            }
          >
            Excel/CSV
          </button>
          <button
            type="button"
            onClick={() => setTab('image')}
            className={
              tab === 'image'
                ? getPrimaryButtonClasses({ color: 'gray', fullWidth: false, size: 'sm' })
                : getSecondaryButtonClasses({ fullWidth: false, size: 'sm' })
            }
          >
            Imagen
          </button>
        </div>
      </div>

      {tab === 'csv' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Podés importar productos desde Excel exportándolo como <span className="font-mono">.csv</span>. Columnas mínimas: <span className="font-mono">brand</span>/<span className="font-mono">marca</span> y <span className="font-mono">model</span>/<span className="font-mono">modelo</span>.
          </div>

          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <label className="text-sm text-gray-700">Modo</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full md:max-w-sm rounded-md border-gray-300 shadow-sm p-2 border text-sm"
            >
              <option value="upsert">Crear/Actualizar productos (stock + precio)</option>
              <option value="prices">Actualizar precios (sin crear)</option>
              <option value="stock">Actualizar stock (suma stock)</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                uploadCsv(f);
                e.currentTarget.value = '';
              }}
              className="block w-full md:max-w-sm text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(example);
                setMessage('Plantilla CSV copiada al portapapeles.');
              }}
              className={getSecondaryButtonClasses({ fullWidth: false, size: 'sm' })}
            >
              Copiar plantilla
            </button>
          </div>

          <div className="rounded border border-gray-200 p-3 bg-gray-50">
            <div className="text-sm font-semibold text-gray-800 mb-2">Aplicar ajuste global</div>
            <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
              <input
                value={adjustPercent}
                onChange={(e) => setAdjustPercent(e.target.value)}
                placeholder="Porcentaje (ej: 10 o -5)"
                inputMode="decimal"
                className="w-full md:max-w-sm rounded-md border-gray-300 shadow-sm p-2 border text-sm"
              />
              <input
                value={adjustPassword}
                onChange={(e) => setAdjustPassword(e.target.value)}
                placeholder="Contraseña admin"
                type="password"
                className="w-full md:max-w-sm rounded-md border-gray-300 shadow-sm p-2 border text-sm"
              />
              <button
                type="button"
                onClick={applyAdjustment}
                disabled={isAdjusting}
                className={getPrimaryButtonClasses({ color: 'gray', disabled: isAdjusting, fullWidth: false, size: 'sm' })}
              >
                {isAdjusting ? 'Aplicando…' : 'Aplicar'}
              </button>
            </div>
          </div>

          {message && (
            <div className="text-sm bg-gray-50 border border-gray-200 rounded p-3 text-gray-800">
              {message}
            </div>
          )}

          {errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded">
              <div className="px-3 py-2 text-sm font-semibold border-b border-gray-200 bg-gray-50">
                Errores ({errors.length})
              </div>
              <div className="divide-y divide-gray-200">
                {errors.map((e) => (
                  <div key={`${e.row}-${e.error}`} className="px-3 py-2 text-sm">
                    Fila {e.row}: {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'image' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Cargá una imagen (lista de precios/stock) para tenerla a la vista mientras actualizás.
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (imageUrl) URL.revokeObjectURL(imageUrl);
              setImageUrl(URL.createObjectURL(f));
              setImageName(f.name);
              setMessage(null);
              e.currentTarget.value = '';
            }}
            className="block w-full md:max-w-sm text-sm"
          />
          {imageUrl && (
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-700 mb-2 truncate">{imageName}</div>
              <div className="max-h-[420px] overflow-auto border border-gray-200 rounded bg-white">
                <img src={imageUrl} alt="Imagen cargada" className="w-full h-auto block" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
