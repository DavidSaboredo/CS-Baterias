import { chromium, Browser, Page } from 'playwright'

/**
 * Interfaz que representa el resultado del scraping de un sitio
 */
export interface PrecioExtracto {
  precio: number | null
  disponible: boolean | null
  error: string | null
  marcaDeTiempo: Date
}

/**
 * Scrapea un sitio web para extraer precio y disponibilidad
 * Utiliza Playwright para navegar sitios con JavaScript dinámico
 *
 * @param url - URL del sitio a scrapear
 * @param selectorPrecio - Selector CSS para extraer el precio (ej: ".price", "[data-price]")
 * @param selectorDisponibilidad - Selector CSS opcional para verificar disponibilidad
 * @param timeoutMs - Tiempo máximo de espera en milisegundos
 * @returns Objeto con precio extraído, disponibilidad y posibles errores
 */
export async function extraerDelSitio(
  url: string,
  selectorPrecio: string,
  selectorDisponibilidad?: string | null,
  timeoutMs: number = 15000
): Promise<PrecioExtracto> {
  let navegador: Browser | null = null
  let pagina: Page | null = null

  try {
    console.log(`[Scraper] Iniciando extracción de ${url}`)

    // Iniciar navegador Chromium
    navegador = await chromium.launch({ headless: true })
    pagina = await navegador.newPage()

    // Configurar timeouts
    pagina.setDefaultTimeout(timeoutMs)
    pagina.setDefaultNavigationTimeout(timeoutMs)

    // Navegar a la URL
    await pagina.goto(url, { waitUntil: 'domcontentloaded' })

    // Esperar a que el selector de precio sea visible
    await pagina.waitForSelector(selectorPrecio, { timeout: 5000 }).catch(() => {
      console.warn(`[Scraper] Selector de precio no encontrado: ${selectorPrecio}`)
    })

    // Extraer precio del HTML
    let precio: number | null = null
    try {
      const textoPrice = await pagina.locator(selectorPrecio).first().textContent()
      if (textoPrice) {
        // Limpiar y extraer número del texto
        const pricioLimpio = textoPrice
          .replace(/[^\d.,]/g, '') // Quitar caracteres no numéricos
          .replace('.', '') // Remover separador de miles (.)
          .replace(',', '.') // Convertir coma a punto decimal

        const precioParsed = parseFloat(pricioLimpio)
        if (!isNaN(precioParsed)) {
          precio = precioParsed
          console.log(`[Scraper] Precio extraído: $${precio.toLocaleString('es-AR')}`)
        }
      }
    } catch (error) {
      console.warn(`[Scraper] Error extrayendo precio:`, error)
    }

    // Extraer disponibilidad si se proporciona selector
    let disponible: boolean | null = null
    if (selectorDisponibilidad) {
      try {
        await pagina.waitForSelector(selectorDisponibilidad, { timeout: 3000 }).catch(() => {})
        const elementos = await pagina.locator(selectorDisponibilidad).count()
        disponible = elementos > 0
        console.log(`[Scraper] Disponibilidad: ${disponible ? 'Sí' : 'No'}`)
      } catch (error) {
        console.warn(`[Scraper] Error extrayendo disponibilidad:`, error)
      }
    }

    await navegador.close()

    return {
      precio,
      disponible,
      error: precio === null ? 'No se pudo extraer precio' : null,
      marcaDeTiempo: new Date(),
    }
  } catch (error: any) {
    const mensajeError = error?.message || String(error)
    console.error(`[Scraper] Error extrayendo de ${url}:`, mensajeError)

    if (navegador) {
      await navegador.close().catch(() => {})
    }

    return {
      precio: null,
      disponible: null,
      error: `Error: ${mensajeError.substring(0, 100)}`,
      marcaDeTiempo: new Date(),
    }
  }
}

/**
 * Scrapea múltiples URLs en paralelo con límite de concurrencia
 * Evita sobrecargar la red ejecutando max N scrapes simultáneamente
 *
 * @param fuentes - Array de fuentes a scrapear con selectores
 * @param concurrencia - Cantidad máxima de scrapes simultáneos
 * @returns Array con resultados de cada fuente
 */
export async function extraerMultiples(
  fuentes: Array<{
    id: number
    url: string
    selectorPrecio: string
    selectorDisponibilidad?: string | null
  }>,
  concurrencia: number = 3
): Promise<
  Array<{
    idFuente: number
    resultado: PrecioExtracto
  }>
> {
  const resultados = []
  const cola = [...fuentes]
  const activos: Promise<any>[] = []

  while (cola.length > 0 || activos.length > 0) {
    // Agregar nuevos scrapes hasta alcanzar el límite de concurrencia
    while (activos.length < concurrencia && cola.length > 0) {
      const fuente = cola.shift()!
      const promesa = extraerDelSitio(
        fuente.url,
        fuente.selectorPrecio,
        fuente.selectorDisponibilidad
      )
        .then((resultado) => ({
          idFuente: fuente.id,
          resultado,
        }))
        .finally(() => {
          const indice = activos.indexOf(promesa)
          if (indice > -1) activos.splice(indice, 1)
        })

      activos.push(promesa)
      resultados.push(promesa)
    }

    // Esperar a que al menos uno se complete
    if (activos.length > 0) {
      await Promise.race(activos)
    }
  }

  return Promise.all(resultados)
}
