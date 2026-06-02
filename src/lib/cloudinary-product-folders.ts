function normalizeCloudinarySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function getProductCloudinaryFolder(productSlug: string) {
  return `products/${normalizeCloudinarySegment(productSlug)}`
}

export function getProductGeneralImageFolder(productSlug: string) {
  return `${getProductCloudinaryFolder(productSlug)}/general`
}

export function getProductVariantImageFolder(productSlug: string, variantKey: string) {
  return `${getProductCloudinaryFolder(productSlug)}/variants/${normalizeCloudinarySegment(variantKey)}`
}
