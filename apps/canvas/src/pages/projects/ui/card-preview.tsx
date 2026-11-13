import { useEffect, useRef, useState } from "react"

import { BlobImage } from "@/shared/ui"

export type ReadPreview = (id: string, signal: AbortSignal) => Promise<Blob | undefined>

export function CardPreview({ id, read }: { id: string; read: ReadPreview }) {
  const container = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<Blob>()

  useEffect(() => {
    const element = container.current
    if (!element) return
    const controller = new AbortController()
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      void read(id, controller.signal).then((image) => {
        if (!controller.signal.aborted) setPreview(image)
      }).catch(() => undefined)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      controller.abort()
    }
  }, [id, read])

  return <div ref={container} className="project-preview">
    {preview && <BlobImage original={preview} alt="" />}
  </div>
}
