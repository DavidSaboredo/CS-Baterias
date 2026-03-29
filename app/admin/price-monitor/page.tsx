'use client'

/**
 * Página principal del Monitor de Precios
 * Permite:
 * - Gestionar fuentes de scraping (agregar, editar, eliminar)
 * - Ver comparativa de precios vs competidores
 * - Testear scraping manual
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Play, AlertCircle, TrendingDown, Search } from 'lucide-react'
import {
  obtenerFuentesScraper,
  agregarFuenteScraper,
  actualizarFuenteScraper,
  eliminarFuenteScraper,
  detectarArticulosStockDesdeUrl,
  guardarDeteccionEnHistorico,
} from '@/app/actions/scraper'

/**
 * Interfaz que representa una fuente de scraping
 */
interface FuenteScraper {
  id: number
  name: string
  url: string
  priceSelector: string
  availabilitySelector: string | null
  active: boolean
  lastFetchedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Interfaz para representar un producto
 */
interface CoincidenciaDetectada {
  id: number
  brand: string
  model: string
  amperage: string
  stock: number
  price: number
  precioDetectado: number | null
  variacionPorcentaje: number | null
  estadoComparativa: 'sin_precio' | 'mas_caro' | 'mas_barato' | 'similar'
  puntaje: number
  coincidencias: string[]
}

interface ResultadoDeteccion {
  url: string
  dominio: string
  nombreSugerido: string
  articulosAnalizados: number
  cantidadCoincidencias: number
  coincidencias: CoincidenciaDetectada[]
}

/**
 * Componente principal de Monitor de Precios
 */
export default function PaginaMonitorPrecios() {
  const [pestanaActiva, setPestanaActiva] = useState<'fuentes' | 'comparativa'>('fuentes')
  const [fuentes, setFuentes] = useState<FuenteScraper[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [fuenteEditando, setFuenteEditando] = useState<FuenteScraper | null>(null)
  const [datoFormulario, setDatoFormulario] = useState({ nombre: '', url: '', selectorPrecio: '', selectorDisponibilidad: '' })
  const [urlAnalisis, setUrlAnalisis] = useState('')
  const [analizandoUrl, setAnalizandoUrl] = useState(false)
  const [resultadoDeteccion, setResultadoDeteccion] = useState<ResultadoDeteccion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [guardandoHistorico, setGuardandoHistorico] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  function formatearMoneda(valor: number) {
    return `$${valor.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
  }

  function mostrarVariacion(item: CoincidenciaDetectada) {
    if (item.variacionPorcentaje === null) return 'Sin dato'
    const signo = item.variacionPorcentaje > 0 ? '+' : ''
    return `${signo}${item.variacionPorcentaje.toFixed(1)}%`
  }

  // Cargar fuentes al montar
  useEffect(() => {
    cargarFuentes()
  }, [])

  /**
   * Obtiene todas las fuentes de la base de datos
   */
  async function cargarFuentes() {
    setCargando(true)
    const resultado = await obtenerFuentesScraper()
    if (resultado.exitoso) {
      setFuentes(resultado.datos as FuenteScraper[])
    }
    setCargando(false)
  }

  async function analizarUrl() {
    if (!urlAnalisis.trim()) {
      setError('Pegá una URL para analizar')
      return
    }

    setAnalizandoUrl(true)
    setError('')

    const resultado = await detectarArticulosStockDesdeUrl(urlAnalisis.trim())

    if (!resultado.exitoso) {
      setResultadoDeteccion(null)
      setError(resultado.error || 'No se pudo analizar la URL')
      setAnalizandoUrl(false)
      return
    }

    setResultadoDeteccion(resultado.datos as ResultadoDeteccion)
    setMensajeExito('Analisis completado')
    setTimeout(() => setMensajeExito(''), 2500)
    setAnalizandoUrl(false)
  }

  function usarDeteccionComoFuente() {
    if (!resultadoDeteccion) return

    setDatoFormulario((anterior) => ({
      ...anterior,
      nombre: resultadoDeteccion.nombreSugerido || anterior.nombre,
      url: resultadoDeteccion.url || anterior.url,
    }))
    setMostrarFormulario(true)
    setFuenteEditando(null)
  }

  async function guardarResultadosEnHistorico() {
    if (!resultadoDeteccion) return

    const itemsGuardables = resultadoDeteccion.coincidencias
      .filter((item) => item.precioDetectado !== null)
      .map((item) => ({
        productId: item.id,
        precioDetectado: item.precioDetectado as number,
      }))

    if (itemsGuardables.length === 0) {
      setError('No hay precios detectados para guardar en historico')
      return
    }

    setGuardandoHistorico(true)
    setError('')

    const resultado = await guardarDeteccionEnHistorico({
      url: resultadoDeteccion.url,
      nombreSugerido: resultadoDeteccion.nombreSugerido,
      coincidencias: itemsGuardables,
    })

    if (!resultado.exitoso) {
      setError(resultado.error || 'No se pudo guardar en historico')
      setGuardandoHistorico(false)
      return
    }

    setMensajeExito(`Historico guardado (${resultado.datos?.guardados || 0} registros)`)
    setTimeout(() => setMensajeExito(''), 3000)
    setGuardandoHistorico(false)
    await cargarFuentes()
  }

  /**
   * Maneja el envío del formulario para agregar/editar fuente
   */
  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')

    // Validar campos requeridos
    if (!datoFormulario.nombre || !datoFormulario.url || !datoFormulario.selectorPrecio) {
      setError('Nombre, URL y Selector de Precio son requeridos')
      setEnviando(false)
      return
    }

    // Llamar acción de agregar o actualizar
    const resultado = fuenteEditando
      ? await actualizarFuenteScraper(fuenteEditando.id, datoFormulario)
      : await agregarFuenteScraper(datoFormulario)

    if (resultado.exitoso) {
      setMensajeExito(fuenteEditando ? 'Fuente actualizada' : 'Fuente agregada')
      setDatoFormulario({ nombre: '', url: '', selectorPrecio: '', selectorDisponibilidad: '' })
      setMostrarFormulario(false)
      setFuenteEditando(null)
      cargarFuentes()
      setTimeout(() => setMensajeExito(''), 3000)
    } else {
      setError(resultado.error || 'Error al guardar')
    }
    setEnviando(false)
  }

  /**
   * Elimina una fuente después de confirmación
   */
  async function manejarEliminacion(id: number) {
    if (!confirm('¿Eliminar esta fuente?')) return
    const resultado = await eliminarFuenteScraper(id)
    if (resultado.exitoso) {
      cargarFuentes()
      setMensajeExito('Fuente eliminada')
      setTimeout(() => setMensajeExito(''), 3000)
    }
  }

  /**
   * Inicia el modo edición de una fuente
   */
  function iniciarEdicion(fuente: FuenteScraper) {
    setFuenteEditando(fuente)
    setDatoFormulario({
      nombre: fuente.name,
      url: fuente.url,
      selectorPrecio: fuente.priceSelector,
      selectorDisponibilidad: fuente.availabilitySelector || '',
    })
    setMostrarFormulario(true)
  }

  /**
   * Cancela el formulario y descarta cambios
   */
  function cancelarEdicion() {
    setMostrarFormulario(false)
    setFuenteEditando(null)
    setDatoFormulario({ nombre: '', url: '', selectorPrecio: '', selectorDisponibilidad: '' })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Encabezado */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Monitor de Precios</h1>
        </div>
      </div>

      {/* Alertas de error y éxito */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}
      {mensajeExito && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
          <p>✓ {mensajeExito}</p>
        </div>
      )}

      {/* Pestañas */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setPestanaActiva('fuentes')}
          className={`px-4 py-3 font-medium transition-colors ${
            pestanaActiva === 'fuentes'
              ? 'border-b-2 border-red-600 text-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Gestionar Fuentes ({fuentes.length})
        </button>
        <button
          onClick={() => setPestanaActiva('comparativa')}
          className={`px-4 py-3 font-medium transition-colors ${
            pestanaActiva === 'comparativa'
              ? 'border-b-2 border-red-600 text-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Comparativa de Precios
        </button>
      </div>

      {/* PESTAÑA 1: Gestionar Fuentes */}
      {pestanaActiva === 'fuentes' && (
        <div>
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-sm font-semibold text-blue-900 mb-2">Deteccion automatica por URL</h2>
            <p className="text-xs text-blue-700 mb-3">
              Pegá una URL y el sistema buscará automaticamente articulos que ya tenés en stock dentro de esa pagina.
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="url"
                value={urlAnalisis}
                onChange={(e) => setUrlAnalisis(e.target.value)}
                placeholder="https://sitio-ejemplo.com/productos"
                className="flex-1 rounded-lg border border-blue-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={analizarUrl}
                disabled={analizandoUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                {analizandoUrl ? 'Analizando...' : 'Buscar articulos'}
              </button>
            </div>
          </div>

          {resultadoDeteccion && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Resultados en {resultadoDeteccion.dominio}</p>
                  <p className="text-xs text-gray-600">
                    {resultadoDeteccion.cantidadCoincidencias} coincidencias sobre {resultadoDeteccion.articulosAnalizados} articulos de tu stock
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={guardarResultadosEnHistorico}
                    disabled={guardandoHistorico}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {guardandoHistorico ? 'Guardando...' : 'Guardar en historico'}
                  </button>
                  <button
                    type="button"
                    onClick={usarDeteccionComoFuente}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-white text-sm font-medium hover:bg-black"
                  >
                    Usar URL en nueva fuente
                  </button>
                </div>
              </div>

              {resultadoDeteccion.cantidadCoincidencias === 0 ? (
                <p className="text-sm text-gray-600">No se detectaron articulos de tu stock en esa pagina.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Articulo</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Stock</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Mi precio</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Precio web</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Variacion</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Puntaje</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Coincidio con</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoDeteccion.coincidencias.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-900 font-medium">
                            {item.brand} {item.model} {item.amperage}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{item.stock}</td>
                          <td className="px-3 py-2 text-gray-700">{formatearMoneda(item.price)}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {item.precioDetectado !== null ? formatearMoneda(item.precioDetectado) : 'No detectado'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                item.estadoComparativa === 'mas_caro'
                                  ? 'bg-red-50 text-red-700'
                                  : item.estadoComparativa === 'mas_barato'
                                    ? 'bg-green-50 text-green-700'
                                    : item.estadoComparativa === 'similar'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {mostrarVariacion(item)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                              {item.puntaje}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.coincidencias.join(' | ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!mostrarFormulario ? (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="mb-6 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Agregar Fuente
            </button>
          ) : (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">{fuenteEditando ? 'Editar' : 'Nueva'} Fuente</h2>
              <form onSubmit={manejarEnvio} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Empresa *
                  </label>
                  <input
                    type="text"
                    value={datoFormulario.nombre}
                    onChange={(e) => setDatoFormulario({ ...datoFormulario, nombre: e.target.value })}
                    placeholder="Ej: Mercado Libre"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={datoFormulario.url}
                    onChange={(e) => setDatoFormulario({ ...datoFormulario, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selector CSS Precio *
                  </label>
                  <input
                    type="text"
                    value={datoFormulario.selectorPrecio}
                    onChange={(e) => setDatoFormulario({ ...datoFormulario, selectorPrecio: e.target.value })}
                    placeholder="Ej: .price, [data-price], span.valor"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Selector CSS para extraer el precio (inspeccioná el sitio)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selector CSS Disponibilidad
                  </label>
                  <input
                    type="text"
                    value={datoFormulario.selectorDisponibilidad}
                    onChange={(e) => setDatoFormulario({ ...datoFormulario, selectorDisponibilidad: e.target.value })}
                    placeholder="Opcional: Ej: .available, [data-stock]"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {enviando ? 'Guardando...' : fuenteEditando ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla de fuentes */}
          {cargando ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : fuentes.length === 0 ? (
            <div className="rounded-lg bg-yellow-50 p-6 text-center text-yellow-700">
              <p>No hay fuentes configuradas. ¡Agrega una para comenzar!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-white shadow">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">URL</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Último Scrape</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {fuentes.map((fuente) => (
                    <tr key={fuente.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{fuente.name}</td>
                      <td className="px-4 py-3">
                        <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
                          {fuente.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fuente.lastFetchedAt
                          ? new Date(fuente.lastFetchedAt).toLocaleDateString('es-AR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => iniciarEdicion(fuente)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => manejarEliminacion(fuente.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Probar ahora"
                            disabled
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: Comparativa de Precios */}
      {pestanaActiva === 'comparativa' && (
        <div>
          <p className="text-gray-600 mb-6">
            Mostrando solo productos con variación &gt;15% respecto a la competencia.
          </p>
          {fuentes.length === 0 ? (
            <div className="rounded-lg bg-blue-50 p-6 text-center text-blue-700">
              <p>No hay fuentes configuradas. Agrega al menos una fuente en la pestaña anterior.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Comparativa próximamente disponible después del primer scrape</p>
              <div className="rounded-lg bg-gray-100 p-12 text-center text-gray-600">
                <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ejecuta el scraper desde la pestaña "Gestionar Fuentes" para obtener datos</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
