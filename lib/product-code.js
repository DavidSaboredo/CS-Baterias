export const PRODUCT_CODE_REGEX = /^[A-Z0-9]{3}$/;

export function normalizeProductCode(input) {
  return (input || '').trim().toUpperCase();
}

export function isValidProductCode(input) {
  return PRODUCT_CODE_REGEX.test(normalizeProductCode(input));
}
