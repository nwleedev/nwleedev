export async function readImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return {
      id: crypto.randomUUID(),
      original: file,
      mimeType: file.type,
      originalWidth: image.naturalWidth,
      originalHeight: image.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
