import type { Asset } from "@/entities/project"

export const maxOriginals = 10

const maxZipBytes = 32 * 1024 ** 2
const maxExtractedBytes = 32 * 1024 ** 2
const maxOriginalPixels = 20_736_000

export function checkZipSize(bytes: number) {
  if (bytes > maxZipBytes) throw new Error("ZIP size limit exceeded")
}

export function checkExtractedSize(bytes: number) {
  if (bytes > maxExtractedBytes) throw new Error("Extracted size limit exceeded")
}

export function checkOriginals(assets: readonly Pick<Asset, "originalWidth" | "originalHeight">[]) {
  if (assets.length > maxOriginals) throw new Error("Original image count limit exceeded")
  let total = 0
  for (const { originalWidth, originalHeight } of assets) {
    if (!Number.isSafeInteger(originalWidth) || originalWidth < 1) throw new Error("Invalid original width")
    if (!Number.isSafeInteger(originalHeight) || originalHeight < 1) throw new Error("Invalid original height")
    total += originalWidth * originalHeight
    if (total > maxOriginalPixels) throw new Error("Original pixel limit exceeded")
  }
}
