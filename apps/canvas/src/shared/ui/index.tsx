import { useEffect, useRef } from "react"

export function BlobImage({ original, alt }: { original: Blob; alt: string }) {
  const image = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const element = image.current
    if (!element) return
    const url = URL.createObjectURL(original)
    element.src = url
    return () => URL.revokeObjectURL(url)
  }, [original])

  return <img ref={image} alt={alt} />
}
