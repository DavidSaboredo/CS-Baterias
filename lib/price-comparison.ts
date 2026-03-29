/**
 * Utilidades para calcular comparativas de precios con la competencia
 * Incluye funciones para analizar variaciones y clasificar precios
 */

export interface ComparativaPrecios {
  productoId: number
  nuestroPrecio: number
  preciosCompetencia: number[]
  precioMinimo: number
  precioMaximo: number
  precioPromedio: number
  porcentajeVariacion: number
  estado: 'muy_barato' | 'barato' | 'competitivo' | 'caro' | 'muy_caro'
}

/**
 * Verifica si hay variación significativa (>15%) en el precio respecto a la competencia
 * @param nuestroPrecio - Nuestro precio actual
 * @param preciosCompetencia - Array de precios de la competencia
 * @returns true si la variación es mayor al 15%
 */
export function hayVariacionSignificativa(
  nuestroPrecio: number,
  preciosCompetencia: number[]
): boolean {
  if (preciosCompetencia.length === 0) return false

  const precioPromedioCompetencia =
    preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length
  const variacion = Math.abs((nuestroPrecio - precioPromedioCompetencia) / precioPromedioCompetencia) * 100

  return variacion > 15
}

/**
 * Calcula el porcentaje de variación de nuestro precio respecto al promedio de competencia
 * @param nuestroPrecio - Nuestro precio
 * @param preciosCompetencia - Precios de competencia
 * @returns Porcentaje de diferencia (positivo = más caro, negativo = más barato)
 */
export function obtenerPorcentajeVariacion(
  nuestroPrecio: number,
  preciosCompetencia: number[]
): number {
  if (preciosCompetencia.length === 0) return 0

  const precioPromedioCompetencia =
    preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length
  return ((nuestroPrecio - precioPromedioCompetencia) / precioPromedioCompetencia) * 100
}

/**
 * Determina el estado del precio: muy_caro, caro, competitivo, barato o muy_barato
 * @param nuestroPrecio - Nuestro precio
 * @param preciosCompetencia - Precios de competencia
 * @returns Estado clasificado
 */
export function obtenerEstadoPrecio(
  nuestroPrecio: number,
  preciosCompetencia: number[]
): ComparativaPrecios['estado'] {
  if (preciosCompetencia.length === 0) return 'competitivo'

  const variacion = obtenerPorcentajeVariacion(nuestroPrecio, preciosCompetencia)

  if (variacion > 25) return 'muy_caro'
  if (variacion > 15) return 'caro'
  if (variacion > -15) return 'competitivo'
  if (variacion > -25) return 'barato'
  return 'muy_barato'
}

/**
 * Calcula una comparativa completa de precios
 * @param nuestroPrecio - Nuestro precio
 * @param preciosCompetencia - Precios de competencia
 * @returns Objeto con todos los datos de la comparativa
 */
export function calcularComparativaPrecios(
  nuestroPrecio: number,
  preciosCompetencia: number[]
): ComparativaPrecios {
  const precioMinimo = preciosCompetencia.length > 0 ? Math.min(...preciosCompetencia) : nuestroPrecio
  const precioMaximo = preciosCompetencia.length > 0 ? Math.max(...preciosCompetencia) : nuestroPrecio
  const precioPromedio =
    preciosCompetencia.length > 0
      ? preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length
      : nuestroPrecio
  const porcentajeVariacion = obtenerPorcentajeVariacion(nuestroPrecio, preciosCompetencia)
  const estado = obtenerEstadoPrecio(nuestroPrecio, preciosCompetencia)

  return {
    productoId: 0, // Se asigna en el contexto
    nuestroPrecio,
    preciosCompetencia,
    precioMinimo,
    precioMaximo,
    precioPromedio,
    porcentajeVariacion,
    estado,
  }
}

/**
 * Formatea un precio en pesos argentinos
 * @param precio - Valor numérico del precio
 * @returns String con formato de moneda
 */
export function formatearPrecio(precio: number): string {
  return `$${precio.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Retorna colores y texto para mostrar el estado del precio visualmente
 * @param estado - Estado del precio
 * @returns Objeto con clases de color, fondo y texto descriptivo
 */
export function obtenerDisplayEstado(estado: ComparativaPrecios['estado']): {
  color: string
  bgColor: string
  texto: string
} {
  switch (estado) {
    case 'muy_caro':
      return { color: 'text-red-700', bgColor: 'bg-red-100', texto: 'Muy Caro' }
    case 'caro':
      return { color: 'text-red-600', bgColor: 'bg-red-50', texto: 'Caro' }
    case 'competitivo':
      return { color: 'text-green-600', bgColor: 'bg-green-50', texto: 'Competitivo' }
    case 'barato':
      return { color: 'text-blue-600', bgColor: 'bg-blue-50', texto: 'Barato' }
    case 'muy_barato':
      return { color: 'text-blue-700', bgColor: 'bg-blue-100', texto: 'Muy Barato' }
  }
}
