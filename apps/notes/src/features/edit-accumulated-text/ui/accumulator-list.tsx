"use client"

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { AccumulatedTextItem } from "@/entities/accumulator"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { GripIcon, RemoveIcon } from "@/shared/ui/icons"

type DragSession = {
  itemId: string
  mode: "keyboard" | "pointer"
  outside: boolean
  pointerId: number | null
  targetIndex: number
}

type AccumulatorListProps = {
  items: readonly AccumulatedTextItem[]
  pending: boolean
  presentation: "management" | "panel"
  onMove(itemId: string, index: number): void
  onRemove(itemId: string): void
}

type AccumulatorItemProps = {
  dragging: boolean
  dropTarget: boolean
  item: AccumulatedTextItem
  outside: boolean
  pending: boolean
  position: number
  positionText: string
  presentation: "management" | "panel"
  total: number
  onHandleClick(itemId: string, position: number): void
  onHandleKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ): void
  onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLButtonElement>): void
  onMove(itemId: string, index: number): void
  onRemove(itemId: string): void
}

type AccumulatorItemActionsProps = {
  itemId: string
  pending: boolean
  position: number
  presentation: "management" | "panel"
  total: number
  onMove(itemId: string, index: number): void
  onRemove(itemId: string): void
}

function AccumulatorItemActions({
  itemId,
  onMove,
  onRemove,
  pending,
  position,
  presentation,
  total,
}: AccumulatorItemActionsProps) {
  if (presentation === "panel") {
    return (
      <IconButton
        aria-label="일괄 복사 항목 제거"
        className="pointer-events-none absolute right-2 top-2 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
        disabled={pending}
        onClick={() => onRemove(itemId)}
        size="compact"
        tone="danger"
      >
        <RemoveIcon />
      </IconButton>
    )
  }

  return (
    <div className="col-start-2 mt-1 flex flex-wrap gap-2">
      <Button
        disabled={pending || position === 0}
        onClick={() => onMove(itemId, position - 1)}
        tone="quiet"
      >
        위로
      </Button>
      <Button
        disabled={pending || position === total - 1}
        onClick={() => onMove(itemId, position + 1)}
        tone="quiet"
      >
        아래로
      </Button>
      <Button
        disabled={pending}
        onClick={() => onRemove(itemId)}
        tone="quiet"
      >
        제거
      </Button>
    </div>
  )
}

function previewItems(
  items: readonly AccumulatedTextItem[],
  drag: DragSession | null,
) {
  if (drag === null || drag.outside || drag.mode === "pointer") {
    return items
  }

  const currentIndex = items.findIndex(({ id }) => id === drag.itemId)

  if (currentIndex < 0 || currentIndex === drag.targetIndex) {
    return items
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(currentIndex, 1)
  nextItems.splice(drag.targetIndex, 0, item)
  return nextItems
}

function pointOutside(element: HTMLElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect()
  const outsideHorizontal = clientX < bounds.left || clientX > bounds.right
  const outsideVertical = clientY < bounds.top || clientY > bounds.bottom
  return outsideHorizontal || outsideVertical
}

function indexAtPoint(element: HTMLElement, clientY: number, total: number) {
  const candidates = element.querySelectorAll<HTMLElement>(
    "[data-accumulator-position]",
  )

  for (const candidate of candidates) {
    const bounds = candidate.getBoundingClientRect()

    if (clientY < bounds.top + bounds.height / 2) {
      return Number(candidate.dataset.accumulatorPosition)
    }
  }

  return Math.max(0, total - 1)
}

function AccumulatorItem({
  dragging,
  dropTarget,
  item,
  onHandleClick,
  onHandleKeyDown,
  onMove,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRemove,
  outside,
  pending,
  position,
  positionText,
  presentation,
  total,
}: AccumulatorItemProps) {
  const itemClassName = joinClassNames(
    "group relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-control border bg-surface p-3 transition-[border-color,opacity,transform]",
    dragging ? "border-action opacity-80" : "border-line",
    dragging && outside ? "border-danger bg-danger/5" : undefined,
    dropTarget ? "border-action ring-2 ring-action/20" : undefined,
  )
  const text = item.textSnapshot || "빈 메모"

  return (
    <li
      className={itemClassName}
      data-accumulator-position={position}
    >
      <button
        aria-label={`${positionText}번째 일괄 복사 항목 순서 변경`}
        aria-pressed={dragging}
        className="min-h-10 min-w-10 touch-none cursor-grab rounded-control border border-line bg-surface-raised text-soft-ink active:cursor-grabbing"
        disabled={pending}
        onClick={() => onHandleClick(item.id, position)}
        onKeyDown={(event) => onHandleKeyDown(event, item.id, position)}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={(event) => onPointerDown(event, item.id, position)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <GripIcon />
      </button>
      <div className="min-w-0 pr-9">
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {text}
        </p>
        {dragging && outside ? (
          <p className="mt-2 text-xs font-semibold text-danger" role="status">
            목록 밖에 놓으면 제거됩니다.
          </p>
        ) : null}
      </div>
      <AccumulatorItemActions
        itemId={item.id}
        onMove={onMove}
        onRemove={onRemove}
        pending={pending}
        position={position}
        presentation={presentation}
        total={total}
      />
    </li>
  )
}

export function AccumulatorList({
  items,
  onMove,
  onRemove,
  pending,
  presentation,
}: AccumulatorListProps) {
  const list = useRef<HTMLOListElement>(null)
  const dragSession = useRef<DragSession | null>(null)
  const suppressHandleClick = useRef(false)
  const [drag, setDrag] = useState<DragSession | null>(null)
  const displayedItems = previewItems(items, drag)

  function updateDrag(nextDrag: DragSession | null) {
    dragSession.current = nextDrag
    setDrag(nextDrag)
  }

  function startPointerDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ) {
    if (pending || event.button !== 0) {
      return
    }

    updateDrag({
      itemId,
      mode: "pointer",
      outside: false,
      pointerId: event.pointerId,
      targetIndex: position,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function movePointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current
    const listElement = list.current

    if (current === null || current.mode !== "pointer") {
      return
    }

    if (current.pointerId !== event.pointerId || listElement === null) {
      return
    }

    const outside = pointOutside(listElement, event.clientX, event.clientY)
    const targetIndex = outside
      ? current.targetIndex
      : indexAtPoint(listElement, event.clientY, items.length)
    updateDrag({ ...current, outside, targetIndex })
  }

  function commitDrag() {
    const current = dragSession.current

    if (current === null) {
      return
    }

    updateDrag(null)

    if (current.outside) {
      onRemove(current.itemId)
      return
    }

    onMove(current.itemId, current.targetIndex)
  }

  function finishPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    suppressHandleClick.current = true
    commitDrag()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current

    if (current?.pointerId !== event.pointerId) {
      return
    }

    updateDrag(null)
  }

  function handleDragClick(itemId: string, position: number) {
    if (suppressHandleClick.current) {
      suppressHandleClick.current = false
      return
    }

    if (pending) {
      return
    }

    const current = dragSession.current

    if (current?.mode === "keyboard") {
      commitDrag()
      return
    }

    updateDrag({
      itemId,
      mode: "keyboard",
      outside: false,
      pointerId: null,
      targetIndex: position,
    })
  }

  function handleDragKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ) {
    const activationKey = event.key === "Enter" || event.key === " "
    const current = dragSession.current

    if (event.key === "Escape" && current !== null) {
      event.preventDefault()
      suppressHandleClick.current = true
      updateDrag(null)
      return
    }

    if (current === null && activationKey) {
      event.preventDefault()
      updateDrag({
        itemId,
        mode: "keyboard",
        outside: false,
        pointerId: null,
        targetIndex: position,
      })
      return
    }

    if (current?.mode !== "keyboard") {
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      const targetIndex = Math.max(0, current.targetIndex - 1)
      updateDrag({ ...current, targetIndex })
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      const lastIndex = items.length - 1
      const targetIndex = Math.min(lastIndex, current.targetIndex + 1)
      updateDrag({ ...current, targetIndex })
      return
    }

    if (activationKey) {
      event.preventDefault()
      suppressHandleClick.current = true
      commitDrag()
    }
  }

  return (
    <ol className="grid gap-2" ref={list}>
      {displayedItems.map((item, position) => {
        const positionText = (position + 1).toLocaleString("ko-KR")
        const dragging = drag?.itemId === item.id
        const outside = dragging && drag.outside
        const pointerDropTarget =
          drag?.mode === "pointer" &&
          !drag.outside &&
          drag.targetIndex === position &&
          drag.itemId !== item.id

        return (
          <AccumulatorItem
            dragging={dragging}
            dropTarget={pointerDropTarget}
            item={item}
            key={item.id}
            onHandleClick={handleDragClick}
            onHandleKeyDown={handleDragKeyDown}
            onMove={onMove}
            onPointerCancel={cancelPointer}
            onPointerDown={startPointerDrag}
            onPointerMove={movePointer}
            onPointerUp={finishPointer}
            onRemove={onRemove}
            outside={outside}
            pending={pending}
            position={position}
            positionText={positionText}
            presentation={presentation}
            total={displayedItems.length}
          />
        )
      })}
    </ol>
  )
}
