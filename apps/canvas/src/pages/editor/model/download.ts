const releaseDelay = 60_000
const unsafeFilenameCharacters = /[<>:"/\\|?*\u0000-\u001f]/gu

export function downloadName(title: string, extension: "png" | "jpg" | "svg" | "zip") {
  const name = title.replace(unsafeFilenameCharacters, "_").trim()
  return `${name || "canvas"}.nwlee.${extension}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  try {
    link.click()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), releaseDelay)
  }
}
