"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"

import {
  advanceReorderPointerSession,
  createReorderPointerSession,
  finishReorderPointerSession,
} from "./reorder-pointer-session"

const POINTER_THRESHOLD_PX = 5
const TOUCH_THRESHOLD_PX = 10
const EDGE_SCROLL_AREA_PX = 32
const EDGE_SCROLL_STEP_PX = 6

type DragView = {
  active: boolean
  itemId: string
  originalIndex: number
  outside: boolean
  targetIndex: number | null
}

type ActiveSession = {
  itemId: string
  outside: boolean
  pointerId: number
  state: ReturnType<typeof createReorderPointerSession>
  target: HTMLButtonElement
}

type UseBatchCopyPointerReorderOptions = {
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  selectedItemId: string | null
  onMove(itemId: string, index: number): Promise<boolean>
  onRemove(itemId: string): void
  onToggleSelection?(itemId: string): void
}

function itemIndexAtPoint(
  list: HTMLOListElement,
  clientX: number,
  clientY: number,
) {
  const bounds = list.getBoundingClientRect()
  const outside =
    clientX < bounds.left ||
    clientX > bounds.right ||
    clientY < bounds.top ||
    clientY > bounds.bottom

  if (outside) {
    return null
  }

  const rows = list.querySelectorAll<HTMLElement>("[data-batch-copy-position]")

  for (const row of rows) {
    const rowBounds = row.getBoundingClientRect()

    if (clientY < rowBounds.top + rowBounds.height / 2) {
      const position = Number(row.dataset.batchCopyPosition)
      return Number.isInteger(position) ? position : null
    }
  }

  return Math.max(0, rows.length - 1)
}

function scrollContainer(element: HTMLElement | null) {
  let current = element?.parentElement ?? null

  while (current !== null) {
    const overflowY = getComputedStyle(current).overflowY

    if (overflowY === "auto" || overflowY === "scroll") {
      return current
    }

    current = current.parentElement
  }

  return null
}

export function useBatchCopyPointerReorder({
  items,
  onMove,
  onRemove,
  onToggleSelection,
  pending,
  presentation,
  selectedItemId,
}: UseBatchCopyPointerReorderOptions) {
  const list = useRef<HTMLOListElement>(null)
  const activeSession = useRef<ActiveSession | null>(null)
  const itemHandles = useRef(new Map<string, HTMLButtonElement>())
  const pointerY = useRef<number | null>(null)
  const scrollFrame = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [drag, setDrag] = useState<DragView | null>(null)

  function stopAutoScroll() {
    if (scrollFrame.current !== null) {
      cancelAnimationFrame(scrollFrame.current)
      scrollFrame.current = null
    }
  }

  function runAutoScroll() {
    const container = scrollContainer(list.current)
    const currentY = pointerY.current

    if (container === null || currentY === null) {
      stopAutoScroll()
      return
    }

    const bounds = container.getBoundingClientRect()
    const nearTop = currentY < bounds.top + EDGE_SCROLL_AREA_PX
    const nearBottom = currentY > bounds.bottom - EDGE_SCROLL_AREA_PX

    if (nearTop) {
      container.scrollBy({ top: -EDGE_SCROLL_STEP_PX })
    } else if (nearBottom) {
      container.scrollBy({ top: EDGE_SCROLL_STEP_PX })
    }

    scrollFrame.current = requestAnimationFrame(runAutoScroll)
  }

  function clearSession(releaseCapture: boolean) {
    const current = activeSession.current

    activeSession.current = null
    pointerY.current = null
    setDrag(null)
    stopAutoScroll()

    if (
      releaseCapture &&
      current?.target.hasPointerCapture(current.pointerId)
    ) {
      current.target.releasePointerCapture(current.pointerId)
    }
  }

  const cancelActiveSession = useEffectEvent(() => clearSession(true))

  useEffect(() => {
    function cancelFromWindow() {
      cancelActiveSession()
    }

    function cancelWhenHidden() {
      if (document.visibilityState === "hidden") {
        cancelActiveSession()
      }
    }

    window.addEventListener("blur", cancelFromWindow)
    document.addEventListener("visibilitychange", cancelWhenHidden)

    return () => {
      window.removeEventListener("blur", cancelFromWindow)
      document.removeEventListener("visibilitychange", cancelWhenHidden)
      cancelActiveSession()
    }
  }, [])

  function registerHandle(itemId: string, element: HTMLButtonElement | null) {
    if (element === null) {
      itemHandles.current.delete(itemId)
    } else {
      itemHandles.current.set(itemId, element)
    }
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ) {
    if (pending || event.button !== 0 || !event.isPrimary) {
      return
    }

    const threshold = event.pointerType === "touch"
      ? TOUCH_THRESHOLD_PX
      : POINTER_THRESHOLD_PX
    const target = event.currentTarget
    activeSession.current = {
      itemId,
      outside: false,
      pointerId: event.pointerId,
      state: createReorderPointerSession({
        focusItemId: itemId,
        itemId,
        itemIds: items.map(({ id }) => id),
        pointerId: event.pointerId,
        selectedItemId,
        startX: event.clientX,
        startY: event.clientY,
        threshold,
      }),
      target,
    }
    target.setPointerCapture(event.pointerId)
    setDrag({
      active: false,
      itemId,
      originalIndex: position,
      outside: false,
      targetIndex: null,
    })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = activeSession.current
    const listElement = list.current

    if (
      current === null ||
      current.pointerId !== event.pointerId ||
      listElement === null
    ) {
      return
    }

    const panel = event.currentTarget.closest<HTMLElement>(
      "[data-batch-copy-panel-boundary]",
    )
    const panelBounds = panel?.getBoundingClientRect()
    const outside =
      presentation === "panel" &&
      panelBounds !== undefined &&
      (
        event.clientX < panelBounds.left ||
        event.clientX > panelBounds.right ||
        event.clientY < panelBounds.top ||
        event.clientY > panelBounds.bottom
      )
    const targetIndex = outside
      ? null
      : itemIndexAtPoint(listElement, event.clientX, event.clientY)
    const state = advanceReorderPointerSession(current.state, {
      clientX: event.clientX,
      clientY: event.clientY,
      targetIndex,
    })
    current.state = state
    current.outside = outside
    pointerY.current = event.clientY

    if (state.active && scrollFrame.current === null) {
      scrollFrame.current = requestAnimationFrame(runAutoScroll)
    }

    if (state.active && presentation === "panel" && selectedItemId !== current.itemId) {
      onToggleSelection?.(current.itemId)
    }

    setDrag({
      active: state.active,
      itemId: current.itemId,
      originalIndex: state.originalIndex,
      outside,
      targetIndex: state.targetIndex,
    })
  }

  async function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = activeSession.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const outside = current.outside
    const completion = finishReorderPointerSession(current.state)
    clearSession(true)

    if (outside && presentation === "panel") {
      onRemove(current.itemId)
      return
    }

    if (completion.command === null) {
      return
    }

    const saved = await onMove(
      completion.command.itemId,
      completion.command.targetIndex,
    )

    requestAnimationFrame(() => itemHandles.current.get(current.itemId)?.focus())

    if (saved) {
      const from = current.state.originalIndex + 1
      const to = completion.command.targetIndex + 1
      setAnnouncement(`${from}번째 항목을 ${to}번째로 옮겼습니다.`)
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activeSession.current?.pointerId === event.pointerId) {
      clearSession(false)
    }
  }

  function moveBy(itemId: string, position: number, offset: -1 | 1) {
    const targetIndex = position + offset

    if (targetIndex < 0 || targetIndex >= items.length) {
      return false
    }

    void onMove(itemId, targetIndex).then((saved) => {
      requestAnimationFrame(() => itemHandles.current.get(itemId)?.focus())

      if (saved) {
        setAnnouncement(`${position + 1}번째 항목을 ${targetIndex + 1}번째로 옮겼습니다.`)
      }
    })
    return true
  }

  function onKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ) {
    const offset = event.key === "ArrowUp"
      ? -1
      : event.key === "ArrowDown"
        ? 1
        : 0

    if (offset === 0) {
      return
    }

    if (moveBy(itemId, position, offset)) {
      event.preventDefault()
    }
  }

  return {
    announcement,
    drag,
    list,
    moveBy,
    onKeyDown,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    registerHandle,
  }
}
