'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { isValidProductCode, normalizeProductCode } from '@/lib/product-code.js';
import { getPrimaryButtonClasses, getSecondaryButtonClasses } from '@/lib/button-styles';

type Product = {
  id: number;
  brand: string;
  model: string;
  amperage: string;
  stock: number;
  minStock: number;
  price: number;
  codigoAleatorio: string;
};

export default function ProductCodeLookup() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function lookup(raw: string) {
    const trimmed = (raw || '').trim();
    const normalizedCode = normalizeProductCode(trimmed);
    setQuery(trimmed);
    setError(null);
    setProduct(null);
    setResults([]);

    setIsLoading(true);
    try {
      if (isValidProductCode(normalizedCode)) {
        const res = await fetch(`/api/products/by-code/${encodeURIComponent(normalizedCode)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error || 'No se pudo buscar el producto.');
          return;
        }
        setProduct(body.product as Product);
      } else {
        if (trimmed.length < 2) {
          setError('Ingresá al menos 2 caracteres para buscar por nombre/modelo.');
          return;
        }
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error || 'No se pudo buscar el producto.');
          return;
        }
        setResults((body.products || []) as Product[]);
        if ((body.products || []).length === 0) setError('Sin resultados.');
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    } catch {
      setError('Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Buscar Producto</h2>
        <Link href="/stock" className="text-sm text-gray-500 hover:text-gray-800">
          Reenfocar scanner
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
        className="flex flex-col md:flex-row gap-2"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
            setProduct(null);
            setResults([]);
          }}
          inputMode="text"
          autoComplete="off"
          placeholder="Código (Ej: A1Z) o nombre/modelo/amperaje..."
          className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`${getPrimaryButtonClasses({ color: 'gray', disabled: isLoading, fullWidth: false, size: 'sm' })} w-full md:w-auto`}
        >
          {isLoading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-3">
          {error}
        </div>
      )}

      {product && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">Producto</div>
              <div className="text-base font-semibold text-gray-900">
                {product.brand} {product.model} {product.amperage}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Código</div>
                  <div className="font-mono font-semibold tracking-widest">{product.codigoAleatorio}</div>
                </div>
                <div>
                  <div className="text-gray-500">Stock</div>
                  <div className="font-semibold">{product.stock}</div>
                </div>
                <div>
                  <div className="text-gray-500">Mínimo</div>
                  <div className="font-semibold">{product.minStock}</div>
                </div>
                <div>
                  <div className="text-gray-500">Precio</div>
                  <div className="font-semibold">${product.price.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(product.codigoAleatorio);
                }}
                className={getSecondaryButtonClasses({ fullWidth: false, size: 'sm' })}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="px-4 py-3 border-b border-gray-200 text-sm text-gray-600">
            Resultados ({results.length})
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {p.brand} {p.model} {p.amperage}
                  </div>
                  <div className="text-xs text-gray-600">
                    Código: <span className="font-mono font-semibold tracking-widest">{p.codigoAleatorio}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Stock: {p.stock} • ${p.price.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(p.codigoAleatorio);
                  }}
                  className={getPrimaryButtonClasses({ color: 'gray', fullWidth: true, size: 'sm' })}
                >
                  Copiar código
                </button>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
