function normalizeCloudinarySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

const CLOUDINARY_PROJECT_FOLDER = "datn-ecomm"

export function getProductCloudinaryFolder(productSlug: string) {
  return `${CLOUDINARY_PROJECT_FOLDER}/products/${normalizeCloudinarySegment(productSlug)}`
}

export function getProductGeneralImageFolder(productSlug: string) {
  return `${getProductCloudinaryFolder(productSlug)}/general`
}

export function getProductDraftGeneralImageFolder() {
  return `${CLOUDINARY_PROJECT_FOLDER}/products/drafts/general`
}

export function getProductVariantImageFolder(productSlug: string, variantKey: string) {
  return `${getProductCloudinaryFolder(productSlug)}/variants/${normalizeCloudinarySegment(variantKey)}`
}
