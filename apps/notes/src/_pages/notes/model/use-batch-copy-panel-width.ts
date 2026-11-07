import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react"

import { readPanelWidth, savePanelWidth } from "../api/panel-width-storage"

import { BOARD_MIN_WIDTH_REM, PANEL_DEFAULT_WIDTH_PX, PANEL_KEYBOARD_STEP_PX, PANEL_MAX_WIDTH_PX, PANEL_MIN_WIDTH_PX } from "./batch-copy-panel-dimensions"

type ResizeGesture = { pointerId: number; startX: number; startWidth: number }

export function useBatchCopyPanelWidth(container: RefObject<HTMLElement | null>) {
  const [dimensions, setDimensions] = useState({ width: PANEL_DEFAULT_WIDTH_PX, maximum: PANEL_MAX_WIDTH_PX })
  const preferred = useRef(PANEL_DEFAULT_WIDTH_PX)
  const current = useRef(PANEL_DEFAULT_WIDTH_PX)
  const maximum = useRef(PANEL_MAX_WIDTH_PX)
  const gesture = useRef<ResizeGesture | null>(null)

  function display(width: number) {
    const bounded = Math.max(PANEL_MIN_WIDTH_PX, Math.min(width, maximum.current))
    current.current = bounded
    const element = container.current
    if (element !== null) element.style.setProperty("--notes-batch-panel-width", `${bounded}px`)
    setDimensions({ width: bounded, maximum: maximum.current })
  }

  const refresh = useEffectEvent(() => {
    const element = container.current
    if (element === null) return
    const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    maximum.current = Math.max(PANEL_MIN_WIDTH_PX, Math.min(PANEL_MAX_WIDTH_PX, element.clientWidth - (BOARD_MIN_WIDTH_REM * rootSize)))
    display(preferred.current)
  })

  useEffect(() => {
    const element = container.current
    if (element === null) return
    preferred.current = readPanelWidth()
    const observer = new ResizeObserver(() => {
      refresh()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [container])

  function commit() {
    preferred.current = current.current
    savePanelWidth(current.current)
  }

  function cancel() {
    if (gesture.current === null) return
    gesture.current = null
    display(preferred.current)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: current.current }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current
    if (active === null || active.pointerId !== event.pointerId) return
    display(active.startWidth + (active.startX - event.clientX))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return
    onPointerMove(event)
    gesture.current = null
    commit()
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && gesture.current !== null) {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      return
    }
    if (gesture.current !== null) return
    const widths: { [key: string]: number | undefined } = {
      ArrowLeft: current.current + PANEL_KEYBOARD_STEP_PX,
      ArrowRight: current.current - PANEL_KEYBOARD_STEP_PX,
      Home: PANEL_MIN_WIDTH_PX,
      End: maximum.current,
    }
    const nextWidth = widths[event.key]
    if (nextWidth === undefined) return
    event.preventDefault()
    event.stopPropagation()
    display(nextWidth)
    commit()
  }

  return { dimensions, onPointerDown, onPointerMove, onPointerUp, onKeyDown, cancel }
}
