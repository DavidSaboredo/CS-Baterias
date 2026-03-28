-- Add optional product image URL for external storefront consumption.
ALTER TABLE "Product"
ADD COLUMN "imageUrl" TEXT;