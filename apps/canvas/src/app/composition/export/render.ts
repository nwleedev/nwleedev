import type { Rect } from "@/entities/project"
import type { ExportRequest, ExportResult, Region } from "@/pages/editor"
import { fitsOutput } from "@/shared/export"

const memoFont = "12px Arial, sans-serif"
const memoLineHeight = 14
const alphaOffset = 3
const bytesPerPixel = 4
const opaque = 255
const scanRows = 64
const escapeCharacters = /[&<>"']/gu
const xmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }

function xml(text: string) {
  return text.replace(escapeCharacters, (char) => xmlEntities[char] ?? char)
}

function clipShape(region: Region | undefined, bounds: Rect) {
  if (!region || region.kind === "rectangle") return undefined
  const path = new Path2D()
  if (region.kind === "ellipse") {
    const rx = bounds.width / 2
    const ry = bounds.height / 2
    const cx = bounds.x + rx
    const cy = bounds.y + ry
    path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    return { path, svg: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>` }
  }
  const [first, ...rest] = region.points
  if (!first) return undefined
  path.moveTo(first.x, first.y)
  for (const point of rest) path.lineTo(point.x, point.y)
  path.closePath()
  const points = region.points.map(({ x, y }) => `${x},${y}`).join(" ")
  return { path, svg: `<polygon points="${points}"/>` }
}

function memoLines(context: OffscreenCanvasRenderingContext2D, body: string, width: number) {
  const lines: string[] = []
  for (const paragraph of body.split("\n")) {
    let line = ""
    for (const character of paragraph) {
      const next = line + character
      if (line && context.measureText(next).width > width) {
        lines.push(line)
        line = character
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Image data unavailable"))
    }, { once: true })
    reader.addEventListener("error", () => reject(reader.error), { once: true })
    reader.readAsDataURL(blob)
  })
}

function svgRect({ x, y, width, height }: Rect) {
  return `x="${x}" y="${y}" width="${width}" height="${height}"`
}

function hasTransparency(context: OffscreenCanvasRenderingContext2D, width: number, height: number) {
  for (let y = 0; y < height; y += scanRows) {
    const { data } = context.getImageData(0, y, width, Math.min(scanRows, height - y))
    for (let i = alphaOffset; i < data.length; i += bytesPerPixel) {
      if (data[i] !== opaque) return true
    }
  }
  return false
}

export async function render(request: ExportRequest): Promise<ExportResult> {
  const { bounds, region, format, quality, images, paper, ink } = request
  if (!fitsOutput(bounds)) throw new Error("Export dimensions exceed limits")
  const svg = format === "svg"
  const { width, height } = bounds
  const canvas = svg ? new OffscreenCanvas(1, 1) : new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: format === "jpg" })
  if (!context) throw new Error("Image export context unavailable")
  context.imageSmoothingQuality = "high"
  context.font = memoFont
  context.textBaseline = "top"
  context.translate(-bounds.x, -bounds.y)
  const clip = clipShape(region, bounds)
  if (clip) context.clip(clip.path)
  const markup: string[] = []
  let clippedMemo = false

  for (const { rect, original, quality: imageQuality, memo } of images) {
    if (svg) {
      const data = await dataUrl(original)
      markup.push(`<image ${svgRect(rect)} href="${xml(data)}"/>`)
    } else {
      let bitmap = await createImageBitmap(original)
      try {
        if (format === "jpg" && imageQuality < 1) {
          const source = new OffscreenCanvas(bitmap.width, bitmap.height)
          const sourceContext = source.getContext("2d")
          if (!sourceContext) throw new Error("Image quality context unavailable")
          sourceContext.drawImage(bitmap, 0, 0)
          if (!hasTransparency(sourceContext, source.width, source.height)) {
            const encoded = await source.convertToBlob({ type: "image/jpeg", quality: imageQuality })
            bitmap.close()
            bitmap = await createImageBitmap(encoded)
          }
        }
        context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height)
      } finally {
        bitmap.close()
      }
    }
    if (!memo) continue
    const box = memo.rect
    const lines = memoLines(context, memo.body, box.width)
    const maxLines = Math.floor(box.height / memoLineHeight)
    clippedMemo ||= lines.length > maxLines || lines.some((line) => context.measureText(line).width > box.width)
    if (svg) {
      const id = `memo-${markup.length}`
      markup.push(`<clipPath id="${id}"><rect ${svgRect(box)}/></clipPath><rect ${svgRect(box)} fill="${xml(paper)}"/>`)
      markup.push(`<g clip-path="url(#${id})" fill="${xml(ink)}" font-family="Arial,sans-serif" font-size="12" dominant-baseline="hanging">`)
      lines.slice(0, maxLines).forEach((line, index) => markup.push(`<text x="${box.x}" y="${box.y + index * memoLineHeight}" xml:space="preserve">${xml(line)}</text>`))
      markup.push("</g>")
    } else {
      context.save()
      context.beginPath()
      context.rect(box.x, box.y, box.width, box.height)
      context.clip()
      context.fillStyle = paper
      context.fillRect(box.x, box.y, box.width, box.height)
      context.fillStyle = ink
      lines.slice(0, maxLines).forEach((line, index) => context.fillText(line, box.x, box.y + index * memoLineHeight))
      context.restore()
    }
  }
  if (svg) {
    const start = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x} ${bounds.y} ${width} ${height}">`
    const mask = clip ? `<defs><clipPath id="selection">${clip.svg}</clipPath></defs><g clip-path="url(#selection)">` : ""
    return { blob: new Blob([start, mask, ...markup, clip ? "</g></svg>" : "</svg>"], { type: "image/svg+xml" }), clippedMemo }
  }
  if (format === "jpg" && hasTransparency(context, width, height)) return { clippedMemo, transparent: true }
  const type = format === "jpg" ? "image/jpeg" : "image/png"
  const blob = await canvas.convertToBlob({ type, quality })
  if (blob.type !== type) throw new Error("Output image format unavailable")
  return { blob, clippedMemo }
}
