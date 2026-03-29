'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Interfaz para los datos al crear una nueva fuente de scraping
 */
export interface CrearEntradaFuenteScraper {
  nombre: string
  url: string
  selectorPrecio: string
  selectorDisponibilidad?: string
}

/**
 * Agrega una nueva fuente de scraping a la base de datos
 * @param entrada - Datos de la nueva fuente
 * @returns Resultado con éxito o error
 */
export async function agregarFuenteScraper(entrada: CrearEntradaFuenteScraper) {
  try {
    const fuente = await prisma.scraperSource.create({
      data: {
        name: entrada.nombre,
        url: entrada.url,
        priceSelector: entrada.selectorPrecio,
        availabilitySelector: entrada.selectorDisponibilidad || null,
      },
    })
    revalidatePath('/admin/price-monitor')
    return { exitoso: true, datos: fuente }
  } catch (error: any) {
    console.error('Error agregando fuente scraper:', error)
    return { exitoso: false, error: 'Error al guardar la fuente' }
  }
}

/**
 * Actualiza una fuente de scraping existente
 * @param id - ID de la fuente
 * @param entrada - Nuevos datos
 * @returns Resultado con éxito o error
 */
export async function actualizarFuenteScraper(
  id: number,
  entrada: CrearEntradaFuenteScraper
) {
  try {
    const fuente = await prisma.scraperSource.update({
      where: { id },
      data: {
        name: entrada.nombre,
        url: entrada.url,
        priceSelector: entrada.selectorPrecio,
        availabilitySelector: entrada.selectorDisponibilidad || null,
      },
    })
    revalidatePath('/admin/price-monitor')
    return { exitoso: true, datos: fuente }
  } catch (error: any) {
    console.error('Error actualizando fuente scraper:', error)
    return { exitoso: false, error: 'Error al actualizar la fuente' }
  }
}

/**
 * Elimina una fuente de scraping
 * @param id - ID de la fuente a eliminar
 * @returns Resultado con éxito o error
 */
export async function eliminarFuenteScraper(id: number) {
  try {
    await prisma.scraperSource.delete({
      where: { id },
    })
    revalidatePath('/admin/price-monitor')
    return { exitoso: true }
  } catch (error: any) {
    console.error('Error eliminando fuente scraper:', error)
    return { exitoso: false, error: 'Error al eliminar la fuente' }
  }
}

/**
 * Obtiene todas las fuentes de scraping activas
 * @returns Lista de fuentes activas
 */
export async function obtenerFuentesScraper() {
  try {
    const fuentes = await prisma.scraperSource.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    return { exitoso: true, datos: fuentes }
  } catch (error: any) {
    console.error('Error obteniendo fuentes scraper:', error)
    return { exitoso: false, error: 'Error al obtener fuentes', datos: [] }
  }
}

/**
 * Activa o desactiva una fuente de scraping
 * @param id - ID de la fuente
 * @param activa - Nuevo estado (true/false)
 * @returns Resultado con éxito o error
 */
export async function alternarActivoFuenteScraper(id: number, activa: boolean) {
  try {
    const fuente = await prisma.scraperSource.update({
      where: { id },
      data: { active: activa },
    })
    revalidatePath('/admin/price-monitor')
    return { exitoso: true, datos: fuente }
  } catch (error: any) {
    console.error('Error alternando estado:', error)
    return { exitoso: false, error: 'Error al actualizar estado' }
  }
}

/**
 * Obtiene todos los precios de competencia registrados para un producto
 * @param idProducto - ID del producto
 * @returns Lista de precios históricos de competencia
 */
export async function obtenerPreciosCompetenciaProducto(idProducto: number) {
  try {
    const precios = await prisma.competitorPrice.findMany({
      where: { productId: idProducto },
      include: {
        source: {
          select: { id: true, name: true, url: true },
        },
      },
      orderBy: { fetchedAt: 'desc' },
      take: 100, // Últimas 100 capturas por producto
    })
    return { exitoso: true, datos: precios }
  } catch (error: any) {
    console.error('Error obteniendo precios de competencia:', error)
    return { exitoso: false, error: 'Error al obtener precios', datos: [] }
  }
}

/**
 * Obtiene los precios más recientes de la competencia para un producto
 * Un precio por cada fuente
 * @param idProducto - ID del producto
 * @returns Los precios más actuales de cada fuente
 */
export async function obtenerUltimosPreciosCompetencia(idProducto: number) {
  try {
    // Obtener el precio más reciente de cada fuente
    const precios = await prisma.competitorPrice.findMany({
      where: { productId: idProducto },
      include: {
        source: {
          select: { id: true, name: true, url: true },
        },
      },
      distinct: ['sourceId'],
      orderBy: { fetchedAt: 'desc' },
    })
    return { exitoso: true, datos: precios }
  } catch (error: any) {
    console.error('Error obteniendo últimos precios:', error)
    return { exitoso: false, error: 'Error al obtener precios', datos: [] }
  }
}

interface CoincidenciaProducto {
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

function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsearPrecioEnNumero(textoPrecio: string): number | null {
  const limpio = textoPrecio.replace(/[^\d.,]/g, '')
  if (!limpio) return null

  let normalizado = limpio

  if (normalizado.includes('.') && normalizado.includes(',')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.')
  } else if (normalizado.includes(',') && !normalizado.includes('.')) {
    normalizado = normalizado.replace(',', '.')
  } else {
    const partes = normalizado.split('.')
    if (partes.length > 2) {
      normalizado = normalizado.replace(/\./g, '')
    }
  }

  const valor = parseFloat(normalizado)
  if (Number.isNaN(valor) || valor <= 0) return null
  return valor
}

function extraerPrecioDesdeTexto(texto: string): number | null {
  const patrones = [
    /(?:ar\$|ars|\$)\s*\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?/gi,
    /(?:ar\$|ars|\$)\s*\d+(?:[.,]\d{1,2})?/gi,
    /\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?\s*(?:pesos|ars)?/gi,
  ]

  for (const patron of patrones) {
    const matches = texto.match(patron) || []
    for (const match of matches) {
      const valor = parsearPrecioEnNumero(match)
      if (valor !== null && valor >= 500) {
        return valor
      }
    }
  }

  return null
}

function obtenerEstadoComparativa(
  precioNuestro: number,
  precioDetectado: number | null
): CoincidenciaProducto['estadoComparativa'] {
  if (precioDetectado === null) return 'sin_precio'

  const variacion = ((precioNuestro - precioDetectado) / precioDetectado) * 100
  if (Math.abs(variacion) <= 15) return 'similar'
  return variacion > 15 ? 'mas_caro' : 'mas_barato'
}

/**
 * Recibe una URL y detecta automaticamente que productos del stock aparecen en esa pagina.
 * Usa coincidencia por marca/modelo/amperaje sobre el contenido HTML completo.
 */
export async function detectarArticulosStockDesdeUrl(url: string) {
  try {
    if (!url?.trim()) {
      return { exitoso: false, error: 'La URL es obligatoria' }
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return { exitoso: false, error: 'La URL no es valida' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        'accept-language': 'es-AR,es;q=0.9',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        exitoso: false,
        error: `No se pudo leer la URL (HTTP ${response.status})`,
      }
    }

    const html = await response.text()
    const htmlSinScripts = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    const textoPagina = normalizarTexto(htmlSinScripts)
    const textoPlano = htmlSinScripts
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const textoPlanoLower = textoPlano.toLowerCase()

    const productos = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: {
        id: true,
        brand: true,
        model: true,
        amperage: true,
        stock: true,
        price: true,
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    })

    const coincidencias: CoincidenciaProducto[] = []

    for (const producto of productos) {
      const marca = normalizarTexto(producto.brand)
      const modelo = normalizarTexto(producto.model)
      const amperaje = normalizarTexto(producto.amperage || '')

      const frases = Array.from(
        new Set(
          [
            `${marca} ${modelo}`.trim(),
            `${modelo} ${amperaje}`.trim(),
            `${marca} ${modelo} ${amperaje}`.trim(),
            modelo,
          ].filter((f) => f.length >= 3)
        )
      )

      let puntaje = 0
      const encontrados: string[] = []

      for (const frase of frases) {
        if (textoPagina.includes(frase)) {
          const cantidadPalabras = frase.split(' ').filter(Boolean).length
          puntaje += cantidadPalabras >= 2 ? 3 : 1
          encontrados.push(frase)
        }
      }

      if (marca && modelo && textoPagina.includes(marca) && textoPagina.includes(modelo)) {
        puntaje += 2
      }

      if (puntaje > 0) {
        const frasesBusqueda = Array.from(
          new Set(
            [
              `${producto.brand} ${producto.model}`.toLowerCase(),
              `${producto.model} ${producto.amperage || ''}`.toLowerCase().trim(),
              producto.model.toLowerCase(),
            ].filter((f) => f.length >= 3)
          )
        )

        let indice = -1
        for (const fraseBusqueda of frasesBusqueda) {
          indice = textoPlanoLower.indexOf(fraseBusqueda)
          if (indice >= 0) break
        }

        let precioDetectado: number | null = null
        if (indice >= 0) {
          const inicio = Math.max(0, indice - 260)
          const fin = Math.min(textoPlano.length, indice + 260)
          const fragmento = textoPlano.slice(inicio, fin)
          precioDetectado = extraerPrecioDesdeTexto(fragmento)
        }

        if (precioDetectado === null) {
          // Fallback: intenta detectar algun precio en toda la pagina.
          precioDetectado = extraerPrecioDesdeTexto(textoPlano)
        }

        const variacionPorcentaje =
          precioDetectado !== null
            ? ((producto.price - precioDetectado) / precioDetectado) * 100
            : null

        coincidencias.push({
          id: producto.id,
          brand: producto.brand,
          model: producto.model,
          amperage: producto.amperage,
          stock: producto.stock,
          price: producto.price,
          precioDetectado,
          variacionPorcentaje,
          estadoComparativa: obtenerEstadoComparativa(producto.price, precioDetectado),
          puntaje,
          coincidencias: Array.from(new Set(encontrados)),
        })
      }
    }

    coincidencias.sort((a, b) => b.puntaje - a.puntaje)

    const dominio = parsedUrl.hostname.replace(/^www\./, '')
    const nombreSugerido = dominio.split('.')[0].replace(/[-_]/g, ' ').trim() || 'Fuente web'

    return {
      exitoso: true,
      datos: {
        url: parsedUrl.toString(),
        dominio,
        nombreSugerido,
        articulosAnalizados: productos.length,
        cantidadCoincidencias: coincidencias.length,
        coincidencias: coincidencias.slice(0, 30),
      },
    }
  } catch (error: any) {
    console.error('Error detectando articulos por URL:', error)
    return {
      exitoso: false,
      error: 'No se pudo analizar la URL. Verifica acceso y formato.',
    }
  }
}

interface EntradaHistoricoDetectado {
  productId: number
  precioDetectado: number
}

/**
 * Guarda en historico los precios detectados desde una URL analizada.
 * Crea la fuente si no existe o reutiliza la existente por URL exacta.
 */
export async function guardarDeteccionEnHistorico(params: {
  url: string
  nombreSugerido: string
  coincidencias: EntradaHistoricoDetectado[]
}) {
  try {
    const url = params.url?.trim()
    const nombreSugerido = params.nombreSugerido?.trim() || 'Fuente web'
    const coincidencias = (params.coincidencias || []).filter(
      (c) => Number.isFinite(c.productId) && Number.isFinite(c.precioDetectado) && c.precioDetectado > 0
    )

    if (!url) {
      return { exitoso: false, error: 'La URL es obligatoria para guardar el historico' }
    }

    if (coincidencias.length === 0) {
      return { exitoso: false, error: 'No hay precios detectados para guardar' }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      let fuente = await tx.scraperSource.findFirst({
        where: { url },
      })

      if (!fuente) {
        fuente = await tx.scraperSource.create({
          data: {
            name: nombreSugerido,
            url,
            // Selectores placeholders: esta fuente fue creada por deteccion automatica.
            priceSelector: 'auto-detect',
            availabilitySelector: null,
            active: true,
            lastFetchedAt: new Date(),
          },
        })
      } else {
        await tx.scraperSource.update({
          where: { id: fuente.id },
          data: {
            lastFetchedAt: new Date(),
          },
        })
      }

      const ahora = new Date()
      const creados = await tx.competitorPrice.createMany({
        data: coincidencias.map((item) => ({
          productId: item.productId,
          sourceId: fuente.id,
          price: item.precioDetectado,
          availability: true,
          fetchedAt: ahora,
        })),
      })

      return { fuenteId: fuente.id, cantidad: creados.count }
    })

    revalidatePath('/admin/price-monitor')
    revalidatePath('/')

    return {
      exitoso: true,
      datos: {
        fuenteId: resultado.fuenteId,
        guardados: resultado.cantidad,
      },
    }
  } catch (error: any) {
    console.error('Error guardando deteccion en historico:', error)
    return {
      exitoso: false,
      error: 'No se pudo guardar en historico',
    }
  }
}
