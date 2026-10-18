"use client"

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

import { advanceReorderPointerSession, createReorderPointerSession, finishReorderPointerSession } from "@/shared/lib/list-reorder"

type DragView = { entryId: string; sourceIndex: number; targetIndex: number | null }
type Session = {
  pointerId: number
  target: HTMLButtonElement
  x: number
  y: number
  state: ReturnType<typeof createReorderPointerSession>
}
type PointerReorderOptions = {
  disabled: boolean
  items: readonly { id: string }[]
  onMove(itemId: string, index: number): Promise<boolean>
}

function scrollContainer(element: HTMLElement) {
  let current: HTMLElement | null = element
  while (current !== null) {
    if (/(auto|scroll)/u.test(getComputedStyle(current).overflowY)) return current
    current = current.parentElement
  }
  return element
}

function indexAtPoint(list: HTMLOListElement, x: number, y: number, sourceIndex: number) {
  const hit = document.elementFromPoint(x, y)
  if (hit === null || !list.contains(hit)) return null
  const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-reorder-id]"))
  let slot = rows.length
  for (const [index, row] of rows.entries()) {
    const bounds = row.getBoundingClientRect()
    if (y < bounds.top + bounds.height / 2) {
      slot = index
      break
    }
  }
  return slot > sourceIndex ? slot - 1 : slot
}

export function usePointerReorder({ disabled, items, onMove }: PointerReorderOptions) {
  const list = useRef<HTMLOListElement>(null)
  const session = useRef<Session | null>(null)
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const frame = useRef<number | null>(null)
  const [drag, setDrag] = useState<DragView | null>(null)
  const [announcement, setAnnouncement] = useState("")

  function clearSession(releaseCapture: boolean) {
    const current = session.current
    session.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setDrag(null)
    if (releaseCapture && current?.target.hasPointerCapture(current.pointerId)) {
      current.target.releasePointerCapture(current.pointerId)
    }
  }

  function updateTarget(current: Session, element: HTMLOListElement) {
    current.state = advanceReorderPointerSession(current.state, {
      clientX: current.x,
      clientY: current.y,
      targetIndex: indexAtPoint(element, current.x, current.y, current.state.originalIndex),
    })
    if (!current.state.active) return
    const next = { entryId: current.state.itemId, sourceIndex: current.state.originalIndex, targetIndex: current.state.targetIndex }
    setDrag((previous) => {
      if (previous?.entryId === next.entryId && previous.targetIndex === next.targetIndex) return previous
      return next
    })
  }

  function autoScroll() {
    frame.current = null
    const current = session.current
    const element = list.current
    if (current === null || element === null) return
    if (!current.state.active) return
    const container = scrollContainer(element)
    const bounds = container.getBoundingClientRect()
    if (current.x < bounds.left || current.x > bounds.right) return
    if (current.y < bounds.top || current.y > bounds.bottom) return
    let step = 0
    if (current.y < bounds.top + 48) step = -12
    if (current.y > bounds.bottom - 48) step = 12
    if (step === 0) return
    const previous = container.scrollTop
    container.scrollBy({ top: step })
    updateTarget(current, element)
    if (container.scrollTop !== previous) frame.current = requestAnimationFrame(autoScroll)
  }

  const cancel = useEffectEvent(() => clearSession(true))
  useEffect(() => {
    function hidden() { if (document.visibilityState === "hidden") cancel() }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") cancel() }
    window.addEventListener("blur", cancel)
    window.addEventListener("resize", cancel)
    document.addEventListener("visibilitychange", hidden)
    document.addEventListener("keydown", escape)
    return () => {
      window.removeEventListener("blur", cancel)
      window.removeEventListener("resize", cancel)
      document.removeEventListener("visibilitychange", hidden)
      document.removeEventListener("keydown", escape)
      cancel()
    }
  }, [])
  const cancelChangedItems = useEffectEvent(() => {
    const current = session.current
    if (current === null) return
    const ids = items.map(({ id }) => id)
    const original = current.state.snapshot.itemIds
    const changed = ids.length !== original.length || ids.some((id, index) => id !== original[index])
    if (disabled || changed) clearSession(true)
  })
  useEffect(() => { cancelChangedItems() }, [disabled, items])

  function registerHandle(id: string, element: HTMLButtonElement | null) {
    if (element === null) handles.current.delete(id)
    else handles.current.set(id, element)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, id: string, index: number) {
    if (disabled || !event.isPrimary || event.button !== 0) return
    if (items[index]?.id !== id) return
    clearSession(true)
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    const threshold = event.pointerType === "touch" ? 10 : 5
    session.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      state: createReorderPointerSession({ focusItemId: id, itemId: id, itemIds: items.map(({ id }) => id), pointerId: event.pointerId, selectedItemId: null, startX: event.clientX, startY: event.clientY, threshold }),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = session.current
    if (current === null || current.pointerId !== event.pointerId || list.current === null) return
    current.x = event.clientX
    current.y = event.clientY
    updateTarget(current, list.current)
    if (current.state.active && frame.current === null) frame.current = requestAnimationFrame(autoScroll)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (session.current?.pointerId === event.pointerId) clearSession(true)
  }

  async function commit(id: string, index: number, from: number) {
    try {
      const saved = await onMove(id, index)
      if (saved) setAnnouncement(`${from + 1}번째 항목을 ${index + 1}번째로 옮겼습니다.`)
      return saved
    } catch {
      setAnnouncement("위치를 변경하지 못했습니다. 다시 시도하세요.")
      return false
    } finally {
      requestAnimationFrame(() => handles.current.get(id)?.focus())
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = session.current
    if (current === null || current.pointerId !== event.pointerId) return
    if (list.current !== null) {
      current.x = event.clientX
      current.y = event.clientY
      updateTarget(current, list.current)
    }
    const completion = finishReorderPointerSession(current.state)
    clearSession(true)
    if (completion.command !== null) {
      void commit(completion.command.itemId, completion.command.targetIndex, current.state.originalIndex)
    }
  }

  function moveBy(id: string, index: number, offset: -1 | 1) {
    const target = index + offset
    if (disabled || target < 0 || target >= items.length) return false
    void commit(id, target, index)
    return true
  }

  return { announcement, drag, list, moveBy, onPointerCancel, onPointerDown, onPointerMove, onPointerUp, registerHandle }
}
