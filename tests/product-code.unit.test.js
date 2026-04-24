import assert from 'node:assert/strict'
import { PRODUCT_CODE_REGEX, normalizeProductCode, isValidProductCode } from '../lib/product-code.js'
import { generateRandomProductCode } from '../lib/product-code.server.js'

async function main() {
  assert.equal(normalizeProductCode(' a1z '), 'A1Z')
  assert.equal(isValidProductCode('A1Z'), true)
  assert.equal(isValidProductCode('a1z'), true)
  assert.equal(isValidProductCode('A1'), false)
  assert.equal(isValidProductCode('A1Z4'), false)
  assert.equal(isValidProductCode('A-Z'), false)

  for (let i = 0; i < 500; i += 1) {
    const c = generateRandomProductCode()
    assert.equal(PRODUCT_CODE_REGEX.test(c), true)
  }

  console.log('✅ product-code.unit.test.js passed')
}

main().catch((e) => {
  console.error('❌ product-code.unit.test.js failed:', e)
  process.exit(1)
})
