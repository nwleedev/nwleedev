"use client"

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import {
  itemIndexForInsertionSlot,
  type MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"

import { BatchCopyItemActions } from "./batch-copy-item-actions"

type MobileBatchCopyConfirmationListProps = {
  disabled: boolean
  entries: readonly MobileBatchCopyEntry[]
  onDuplicate(entryId: string): void
  onMove(entryId: string, index: number): Promise<boolean>
  onRemove(entryId: string): void
}

type TouchReorderGesture = {
  active: boolean
  entryId: string
  pointerId: number
  sourceIndex: number
  startX: number
  startY: number
  targetIndex: number
  timer: ReturnType<typeof setTimeout>
}

type TouchReorderView = {
  entryId: string
  sourceIndex: number
  targetIndex: number
}

type MobileBatchCopyEntryRowProps = {
  disabled: boolean
  dragging: boolean
  dropPlacement: "after" | "before" | null
  entry: MobileBatchCopyEntry
  insertionItemCount: number
  insertionItemIndex: number
  position: number
  showInsertionTarget: boolean
  onDuplicate(entryId: string): void
  onInsertion(itemIndex: number): void
  onMoveChoice(entryId: string): void
  onPointerCancel(event: ReactPointerEvent<HTMLElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    entryId: string,
    index: number,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLElement>): void
  onRemove(entryId: string): void
}

type InsertionTargetProps = {
  currentIndex: number
  disabled: boolean
  itemCount: number
  slot: number
  onSelect(itemIndex: number): void
}

const longPressDuration = 500
const longPressMovement = 10

function InsertionTarget({
  currentIndex,
  disabled,
  itemCount,
  onSelect,
  slot,
}: InsertionTargetProps) {
  const itemIndex = itemIndexForInsertionSlot(
    currentIndex,
    slot,
    itemCount,
  )
  const unavailable = disabled || itemIndex === null
  const positionText = (slot + 1).toLocaleString("ko-KR")

  function select() {
    if (itemIndex !== null) {
      onSelect(itemIndex)
    }
  }

  return (
    <button
      aria-label={`${positionText}번째 삽입 위치`}
      className="group/target flex min-h-6 w-full items-center gap-2 py-1 text-xs font-semibold text-soft-ink disabled:opacity-35"
      disabled={unavailable}
      onClick={select}
      type="button"
    >
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-line-strong transition-[height,background-color] group-hover/target:h-0.5 group-hover/target:bg-action group-focus-visible/target:h-0.5 group-focus-visible/target:bg-action"
      />
      <span>이 위치로 이동</span>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-line-strong transition-[height,background-color] group-hover/target:h-0.5 group-hover/target:bg-action group-focus-visible/target:h-0.5 group-focus-visible/target:bg-action"
      />
    </button>
  )
}

function MobileBatchCopyEntryRow({
  disabled,
  dragging,
  dropPlacement,
  entry,
  insertionItemCount,
  insertionItemIndex,
  onDuplicate,
  onInsertion,
  onMoveChoice,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRemove,
  position,
  showInsertionTarget,
}: MobileBatchCopyEntryRowProps) {
  const positionText = (position + 1).toLocaleString("ko-KR")
  const itemLabel = `${positionText}번째 일괄 복사 항목`
  const articleClassName = joinClassNames(
    "relative touch-pan-y rounded-note border border-note-line bg-note px-4 py-4 pr-12 text-sm leading-6 text-ink shadow-note transition-[border-color,box-shadow,transform]",
    dragging ? "-translate-y-1 scale-[1.01] border-action shadow-floating" : undefined,
    dropPlacement === "before" ? "before:absolute before:-top-2 before:left-1 before:right-1 before:h-1 before:rounded-full before:bg-action" : undefined,
    dropPlacement === "after" ? "after:absolute after:-bottom-2 after:left-1 after:right-1 after:h-1 after:rounded-full after:bg-action" : undefined,
  )

  function chooseMove() {
    onMoveChoice(entry.id)
  }

  function duplicate() {
    onDuplicate(entry.id)
  }

  function remove() {
    onRemove(entry.id)
  }

  function beginPointer(event: ReactPointerEvent<HTMLElement>) {
    onPointerDown(event, entry.id, position)
  }

  function preventContextMenu(event: ReactMouseEvent<HTMLElement>) {
    if (dragging) {
      event.preventDefault()
    }
  }

  return (
    <li data-mobile-batch-copy-entry={position}>
      {showInsertionTarget ? (
        <InsertionTarget
          currentIndex={insertionItemIndex}
          disabled={disabled}
          itemCount={insertionItemCount}
          onSelect={onInsertion}
          slot={position}
        />
      ) : null}
      <article
        aria-label={itemLabel}
        className={articleClassName}
        onContextMenu={preventContextMenu}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={beginPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="absolute right-2 top-2">
          <BatchCopyItemActions
            disabled={disabled}
            itemLabel={itemLabel}
            onDelete={remove}
            onDuplicate={duplicate}
            onMove={chooseMove}
          />
        </div>
        <p className="whitespace-pre-wrap break-words">
          {entry.textSnapshot || "빈 메모"}
        </p>
      </article>
    </li>
  )
}

function indexAtPoint(element: HTMLElement, clientY: number, itemCount: number) {
  const candidates = element.querySelectorAll<HTMLElement>(
    "[data-mobile-batch-copy-entry]",
  )

  for (const candidate of candidates) {
    const bounds = candidate.getBoundingClientRect()

    if (clientY < bounds.top + bounds.height / 2) {
      return Number(candidate.dataset.mobileBatchCopyEntry)
    }
  }

  return Math.max(0, itemCount - 1)
}

export function MobileBatchCopyConfirmationList({
  disabled,
  entries,
  onDuplicate,
  onMove,
  onRemove,
}: MobileBatchCopyConfirmationListProps) {
  const list = useRef<HTMLOListElement>(null)
  const gesture = useRef<TouchReorderGesture | null>(null)
  const [drag, setDrag] = useState<TouchReorderView | null>(null)
  const [placementEntryId, setPlacementEntryId] = useState<string | null>(null)
  const placementIndex = entries.findIndex(({ id }) => id === placementEntryId)
  const placementActive = placementIndex >= 0
  const itemCount = entries.length
  const lastInsertionSlot = itemCount
  const movingPosition = drag === null
    ? ""
    : (drag.targetIndex + 1).toLocaleString("ko-KR")

  useEffect(() => {
    const element = list.current

    function preventNativePan(event: TouchEvent) {
      if (gesture.current?.active) {
        event.preventDefault()
      }
    }

    element?.addEventListener("touchmove", preventNativePan, {
      passive: false,
    })

    return () => {
      element?.removeEventListener("touchmove", preventNativePan)

      if (gesture.current !== null) {
        clearTimeout(gesture.current.timer)
      }
    }
  }, [])

  function clearGesture(element: HTMLElement | null, pointerId: number) {
    const current = gesture.current

    if (current !== null) {
      clearTimeout(current.timer)
    }

    gesture.current = null
    setDrag(null)

    if (element?.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
  }

  function beginTouchReorder(
    event: ReactPointerEvent<HTMLElement>,
    entryId: string,
    sourceIndex: number,
  ) {
    if (disabled || event.pointerType !== "touch" || !event.isPrimary) {
      return
    }

    const pointerId = event.pointerId
    const timer = setTimeout(() => {
      const current = gesture.current

      if (current === null || current.pointerId !== pointerId) {
        return
      }

      current.active = true
      setDrag({ entryId, sourceIndex, targetIndex: sourceIndex })
    }, longPressDuration)

    gesture.current = {
      active: false,
      entryId,
      pointerId,
      sourceIndex,
      startX: event.clientX,
      startY: event.clientY,
      targetIndex: sourceIndex,
      timer,
    }
    event.currentTarget.setPointerCapture(pointerId)
  }

  function moveTouchReorder(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (!current.active && distance > longPressMovement) {
      clearGesture(event.currentTarget, event.pointerId)
      return
    }

    if (!current.active || list.current === null) {
      return
    }

    event.preventDefault()
    const targetIndex = indexAtPoint(list.current, event.clientY, itemCount)
    current.targetIndex = targetIndex
    setDrag({
      entryId: current.entryId,
      sourceIndex: current.sourceIndex,
      targetIndex,
    })
  }

  function cancelTouchReorder(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current?.pointerId === event.pointerId) {
      clearGesture(null, event.pointerId)
    }
  }

  function finishTouchReorder(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const shouldMove =
      current.active && current.sourceIndex !== current.targetIndex
    const entryId = current.entryId
    const targetIndex = current.targetIndex
    clearGesture(event.currentTarget, event.pointerId)

    if (shouldMove) {
      void onMove(entryId, targetIndex)
    }
  }

  function chooseMove(entryId: string) {
    setPlacementEntryId(entryId)
  }

  async function moveToInsertion(itemIndex: number) {
    if (placementEntryId === null) {
      return
    }

    const saved = await onMove(placementEntryId, itemIndex)

    if (saved) {
      setPlacementEntryId(null)
    }
  }

  function cancelPositionChoice() {
    setPlacementEntryId(null)
  }

  return (
    <div className="grid gap-3">
      {placementActive ? (
        <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-raised px-3 py-2">
          <p className="text-sm font-semibold">옮길 위치를 선택하세요.</p>
          <Button onClick={cancelPositionChoice} tone="quiet">
            취소
          </Button>
        </div>
      ) : null}
      {drag ? (
        <p className="sr-only" role="status">
          {movingPosition}번째 위치로 이동 중
        </p>
      ) : null}
      <ol className="grid gap-3" ref={list}>
        {entries.map((entry, position) => {
          const dragging = drag?.entryId === entry.id
          const target = drag?.targetIndex === position
          let dropPlacement: "after" | "before" | null = null

          if (target && drag !== null && drag.targetIndex < drag.sourceIndex) {
            dropPlacement = "before"
          } else if (
            target &&
            drag !== null &&
            drag.targetIndex > drag.sourceIndex
          ) {
            dropPlacement = "after"
          }

          return (
            <MobileBatchCopyEntryRow
              disabled={disabled}
              dragging={dragging}
              dropPlacement={dropPlacement}
              entry={entry}
              insertionItemCount={itemCount}
              insertionItemIndex={placementIndex}
              key={entry.id}
              onDuplicate={onDuplicate}
              onInsertion={moveToInsertion}
              onMoveChoice={chooseMove}
              onPointerCancel={cancelTouchReorder}
              onPointerDown={beginTouchReorder}
              onPointerMove={moveTouchReorder}
              onPointerUp={finishTouchReorder}
              onRemove={onRemove}
              position={position}
              showInsertionTarget={placementActive}
            />
          )
        })}
        {placementActive ? (
          <li role="presentation">
            <InsertionTarget
              currentIndex={placementIndex}
              disabled={disabled}
              itemCount={itemCount}
              onSelect={moveToInsertion}
              slot={lastInsertionSlot}
            />
          </li>
        ) : null}
      </ol>
    </div>
  )
}
