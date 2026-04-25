'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { getPrimaryButtonClasses } from '@/lib/button-styles';

type ProductForLabel = {
  id: number;
  brand: string;
  model: string;
  amperage: string;
  codigoAleatorio: string;
};

export default function ProductCodeLabels({ products }: { products: ProductForLabel[] }) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `etiquetas_productos_${new Date().toISOString().slice(0, 10)}`,
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <style jsx global>{`
        @media print {
          .print-etiquetas-scroll {
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          .print-etiquetas-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Etiquetas (Re-etiquetado)</h2>
        <button
          type="button"
          onClick={handlePrint}
          className={getPrimaryButtonClasses({ color: 'gray', fullWidth: false, size: 'sm' })}
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      <div ref={componentRef} className="print-etiquetas-scroll max-h-[420px] overflow-y-auto pr-1">
        <div className="print-etiquetas-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500">Código</div>
              <div className="font-mono text-2xl font-bold tracking-widest">{p.codigoAleatorio}</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {p.brand} {p.model}
              </div>
              <div className="text-sm text-gray-600">{p.amperage}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
