import crypto from 'node:crypto';
import { normalizeProductCode, PRODUCT_CODE_REGEX } from './product-code.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 3;
const MAX_ATTEMPTS = 2000;

export function generateRandomProductCode() {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

export async function generateUniqueProductCode(prisma) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const code = generateRandomProductCode();
    const existing = await prisma.product.findUnique({
      where: { codigoAleatorio: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('No se pudo generar un código único (espacio agotado o demasiadas colisiones).');
}

export async function createProductWithUniqueCode(prisma, data) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const codigoAleatorio = await generateUniqueProductCode(prisma);
    try {
      return await prisma.product.create({
        data: {
          ...data,
          codigoAleatorio,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') continue;
      throw error;
    }
  }
  throw new Error('No se pudo crear el producto con un código único.');
}

export async function findProductByCode(prisma, inputCode) {
  const codigoAleatorio = normalizeProductCode(inputCode);
  if (!PRODUCT_CODE_REGEX.test(codigoAleatorio)) return null;
  return prisma.product.findUnique({
    where: { codigoAleatorio },
  });
}
