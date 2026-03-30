/**
 * Product normalization utility to ensure consistent matching
 * Used by both manual addProduct and bulk import to prevent duplicate products
 */

export function normalizeProductIdentity(brand: string, model: string, amperage: string) {
  return {
    brand: brand.trim().toUpperCase(),
    model: model.trim().toUpperCase(),
    amperage: amperage.trim().toUpperCase(),
  }
}

export function productIdentityKey(brand: string, model: string, amperage: string): string {
  const { brand: b, model: m, amperage: a } = normalizeProductIdentity(brand, model, amperage)
  return `${b}|${m}|${a}`
}
