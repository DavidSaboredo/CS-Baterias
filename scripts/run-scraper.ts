#!/usr/bin/env node
/**
 * Script para ejecutar el scraper de precios de forma manual o automática
 * Uso: npx tsx scripts/run-scraper.ts
 * También usado por Vercel Cron Jobs
 */

import { prisma } from '../lib/prisma'
import { extraerMultiples } from '../lib/scraper'

/**
 * Ejecuta el scraper de precios
 * - Obtiene todas las fuentes activas
 * - Scrapea cada una en paralelo
 * - Guarda resultados en base de datos
 * - Muestra resumen de éxitos y errores
 */
async function ejecutarScraper() {
  console.log('\n=== INICIANDO SCRAPER DE PRECIOS ===')
  console.log(`Marca de tiempo: ${new Date().toISOString()}\n`)

  try {
    // Obtener todas las fuentes activas
    const fuentes = await prisma.scraperSource.findMany({
      where: { active: true },
    })

    if (fuentes.length === 0) {
      console.log('[Información] No hay fuentes activas configuradas.')
      return
    }

    console.log(`[Información] Scrapeando ${fuentes.length} fuente(s)...\n`)

    // Scrapear todas las fuentes (máx 3 simultáneas)
    const resultados = await extraerMultiples(
      fuentes.map((f) => ({
        id: f.id,
        url: f.url,
        selectorPrecio: f.priceSelector,
        selectorDisponibilidad: f.availabilitySelector,
      })),
      3 // Máx 3 scrapes concurrentes
    )

    // Procesar resultados
    let conteoExito = 0
    let conteoError = 0
    const productosExtractos = new Map<number, number[]>()

    for (const { idFuente, resultado } of resultados) {
      const fuente = fuentes.find((f) => f.id === idFuente)!

      if (resultado.error) {
        conteoError++
        console.error(`❌ ${fuente.name}: ${resultado.error}`)
      } else if (resultado.precio !== null) {
        conteoExito++
        console.log(`✓ ${fuente.name}: $${resultado.precio.toLocaleString('es-AR')}`)

        // Actualizar última fecha de scraping exitosa
        await prisma.scraperSource.update({
          where: { id: idFuente },
          data: { lastFetchedAt: new Date() },
        })
      }
    }

    console.log(`\n=== RESUMEN ===`)
    console.log(`✓ Exitosos: ${conteoExito}`)
    console.log(`❌ Errores: ${conteoError}`)
    console.log(`Total procesados: ${resultados.length}`)
    console.log('\n')

    if (conteoExito > 0) {
      console.log('[Éxito] Scraper completado exitosamente')
      process.exit(0)
    } else {
      console.log('[Error] Ninguna fuente se scrapeó exitosamente')
      process.exit(1)
    }
  } catch (error) {
    console.error('[Error Fatal] Error ejecutando scraper:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar scraper
ejecutarScraper().catch((error) => {
  console.error('Error no capturado:', error)
  process.exit(1)
})
