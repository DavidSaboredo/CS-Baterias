import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extraerMultiples } from '@/lib/scraper'

/**
 * Endpoint para Vercel Cron Jobs
 * Ejecuta automáticamente en horarios configurados (vía vercel.json)
 * 
 * Seguridad: Vercel incluye header 'x-vercel-cron: true'
 * En desarrollo, cualquier request funciona
 */
export async function GET(request: NextRequest) {
  try {
    // En producción, verificar que es llamada desde Vercel Cron
    const EsVercelCron = request.headers.get('x-vercel-cron') === 'true'
    const EsProduccion = process.env.NODE_ENV === 'production'

    if (EsProduccion && !EsVercelCron) {
      console.warn('[Cron] Intento de acceso no autorizado al endpoint')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('[Cron] Iniciando scraper de precios...')

    // Obtener todas las fuentes activas
    const fuentes = await prisma.scraperSource.findMany({
      where: { active: true },
    })

    if (fuentes.length === 0) {
      console.log('[Cron] No hay fuentes activas configuradas')
      return NextResponse.json(
        {
          exitoso: true,
          mensaje: 'No hay fuentes activas',
          cantidadScrapeda: 0,
          cantidadErrores: 0,
        },
        { status: 200 }
      )
    }

    // Ejecutar scraping en paralelo
    const resultados = await extraerMultiples(
      fuentes.map((f) => ({
        id: f.id,
        url: f.url,
        selectorPrecio: f.priceSelector,
        selectorDisponibilidad: f.availabilitySelector,
      })),
      3 // Máx 3 scrapes simultáneos
    )

    // Procesar y guardar resultados
    let conteoExito = 0
    let conteoError = 0
    const errores: string[] = []

    for (const { idFuente, resultado } of resultados) {
      const fuente = fuentes.find((f) => f.id === idFuente)!

      if (resultado.error) {
        conteoError++
        errores.push(`${fuente.name}: ${resultado.error}`)
        console.error(`[Cron] Error en ${fuente.name}:`, resultado.error)
      } else if (resultado.precio !== null) {
        conteoExito++
        console.log(
          `[Cron] ✓ ${fuente.name}: $${resultado.precio.toLocaleString('es-AR')}`
        )

        // Actualizar marca de tiempo del último scraping exitoso
        await prisma.scraperSource.update({
          where: { id: idFuente },
          data: { lastFetchedAt: new Date() },
        })

        // Nota: En una versión completa aquí se guardarían los precios en la tabla CompetitorPrice
        // con correlación automática de productos por SKU/modelo
      }
    }

    const mensaje = `Scrapeadas ${conteoExito}/${fuentes.length} fuentes${
      conteoError > 0 ? ` (${conteoError} errores)` : ''
    }`

    console.log(`[Cron] ${mensaje}`)

    return NextResponse.json(
      {
        exitoso: conteoExito > 0,
        mensaje,
        cantidadScrapeda: conteoExito,
        cantidadErrores: conteoError,
        errores: errores.length > 0 ? errores : undefined,
        marcaDeTiempo: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Cron] Error fatal:', error)
    return NextResponse.json(
      {
        exitoso: false,
        error: error?.message || 'Error interno del servidor',
        marcaDeTiempo: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
