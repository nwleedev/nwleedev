import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type Konva from "konva"

import { initialViewport, touchDragTarget, zoomAt, type Point, type Viewport } from "./viewport"

const wheelRate = 0.002
const zoomStep = 1.25
const tapSlop = 6
const fitPadding = 24
const minimumZoom = 0.01
const maximumZoom = 16
const linePixels = 16

type Input = "mouse" | "trackpad"
type Contact = { point: Point; origin: Point; hit?: string; pan: boolean; moved: boolean }

function center(a: Point, b: Point) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function useViewport(selectedId: string | undefined, select: (id: string | undefined) => void) {
  const stage = useRef<Konva.Stage>(null)
  const scene = useRef<Konva.Group>(null)
  const contacts = useRef(new Map<number, Contact>())
  const suspended = useRef<Konva.Node[]>([])
  const cancelled = useRef(false)
  const space = useRef(false)
  const [view, setView] = useState<Viewport>(initialViewport)
  const [hand, setHand] = useState(false)
  const [input, setInput] = useState<Input>("mouse")

  useEffect(() => {
    const clear = () => { space.current = false }
    function start(event: KeyboardEvent) {
      if (event.code !== "Space" || event.defaultPrevented) return
      const target = event.target
      if (target !== document.body) return
      event.preventDefault()
      space.current = true
    }
    function release(event: KeyboardEvent) {
      if (event.code === "Space") clear()
    }
    window.addEventListener("keydown", start)
    window.addEventListener("keyup", release)
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", start)
      window.removeEventListener("keyup", release)
      window.removeEventListener("blur", clear)
    }
  }, [])

  function local(event: { clientX: number; clientY: number }) {
    const rect = stage.current?.container().getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  function scaled(current: Viewport, point: Point, factor: number) {
    const scale = Math.max(minimumZoom, Math.min(maximumZoom, current.scale * factor))
    return zoomAt(current, point, scale)
  }

  function suspend(node: Konva.Node | undefined) {
    if (!node?.draggable()) return
    suspended.current.push(node)
    node.draggable(false)
  }

  function cancelDrags() {
    cancelled.current = true
    for (const node of scene.current?.find(".placement, .resize-handle") ?? []) suspend(node)
  }

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const active = contacts.current
    if (!active.size) {
      for (const node of suspended.current) if (node.getStage()) node.draggable(!hand)
      suspended.current = []
      cancelled.current = false
    }
    const point = local(event)
    const shape = stage.current?.getIntersection(point)
    const placement = shape?.findAncestor(".placement", true)
    const handle = shape?.hasName("resize-handle") ? shape : undefined
    const hit = placement?.id()
    const handMode = hand || space.current
    const touch = event.pointerType === "touch"
    const pan = handMode || (touch ? !handle && touchDragTarget(selectedId ?? null, hit ?? null, handMode) === "viewport" : !placement && !handle)
    active.set(event.pointerId, { point, origin: point, hit, pan, moved: false })
    if (active.size > 1) {
      cancelDrags()
    } else if (pan) {
      suspend(placement)
      suspend(handle)
    }
    // Capture on the native canvas target so Konva still receives compatibility events.
    if (event.target instanceof Element) event.target.setPointerCapture(event.pointerId)
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const active = contacts.current
    const contact = active.get(event.pointerId)
    if (!contact) return
    const point = local(event)
    const previous = contact.point
    contact.point = point
    contact.moved ||= distance(contact.origin, point) >= tapSlop
    if (active.size === 2) {
      const other = [...active.entries()].find(([id]) => id !== event.pointerId)?.[1]
      if (!other) return
      const before = center(previous, other.point)
      const after = center(point, other.point)
      const span = distance(previous, other.point)
      const factor = span ? distance(point, other.point) / span : 1
      setView((current) => {
        const zoomed = scaled(current, before, factor)
        return { ...zoomed, x: zoomed.x + (after.x - before.x), y: zoomed.y + (after.y - before.y) }
      })
    } else if (active.size === 1 && (contact.pan || cancelled.current)) {
      setView((current) => ({ ...current, x: current.x + (point.x - previous.x), y: current.y + (point.y - previous.y) }))
    }
  }

  function end(event: ReactPointerEvent<HTMLDivElement>) {
    const contact = contacts.current.get(event.pointerId)
    contacts.current.delete(event.pointerId)
    if (event.type !== "pointerup") {
      if (contact) cancelDrags()
      return
    }
    if (!contact || cancelled.current || contact.moved || hand || space.current) return
    if (event.pointerType === "touch" || !contact.hit) {
      const shape = stage.current?.getIntersection(local(event))
      const released = shape?.findAncestor(".placement", true)?.id()
      if (!shape?.hasName("resize-handle") && contact.hit === released) select(released)
    }
  }

  function wheel(event: WheelEvent) {
    event.preventDefault()
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? linePixels :
      event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? stage.current?.height() ?? 1 : 1
    if (input === "trackpad" && !event.ctrlKey && !event.metaKey) {
      setView((current) => ({ ...current, x: current.x - event.deltaX * unit, y: current.y - event.deltaY * unit }))
      return
    }
    const point = local(event)
    const factor = Math.exp(-event.deltaY * unit * wheelRate)
    setView((current) => scaled(current, point, factor))
  }

  function zoom(inward: boolean) {
    const canvas = stage.current
    if (!canvas) return
    const point = { x: canvas.width() / 2, y: canvas.height() / 2 }
    setView((current) => scaled(current, point, inward ? zoomStep : 1 / zoomStep))
  }

  function fit() {
    const canvas = stage.current
    const bounds = scene.current?.getClientRect({ skipTransform: true, skipStroke: true })
    if (!canvas || !bounds?.width || !bounds.height) {
      setView(initialViewport)
      return
    }
    const { width, height } = canvas.size()
    const scale = Math.min(1, Math.max(Number.EPSILON, Math.min(
      (width - 2 * fitPadding) / bounds.width, (height - 2 * fitPadding) / bounds.height,
    )))
    setView({
      scale,
      x: (width - bounds.width * scale) / 2 - bounds.x * scale,
      y: (height - bounds.height * scale) / 2 - bounds.y * scale,
    })
  }

  return {
    stage, scene, view, hand, setHand, input, setInput, down, move, end, wheel, zoom, fit,
    dragCancelled: () => cancelled.current,
    setSpace: (pressed: boolean) => { space.current = pressed },
  }
}
