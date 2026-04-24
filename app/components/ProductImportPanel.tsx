'use client';

import { useMemo, useState } from 'react';

export default function ProductImportPanel() {
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

  const example = useMemo(() => {
    return [
      'brand,model,amperage,stock,minStock,price',
      'Moura,M20GD,65Ah,5,2,1000',
      'Varta,Blue Dynamic,60Ah,3,2,1200',
    ].join('\n');
  }, []);

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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('csv')}
            className={`px-3 py-2 rounded text-sm border ${
              tab === 'csv' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Excel/CSV
          </button>
          <button
            type="button"
            onClick={() => setTab('image')}
            className={`px-3 py-2 rounded text-sm border ${
              tab === 'image' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
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
              className="bg-white border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 text-sm"
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
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm disabled:opacity-50"
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
