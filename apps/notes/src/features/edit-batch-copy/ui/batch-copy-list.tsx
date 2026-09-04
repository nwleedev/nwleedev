"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"

import {
  itemIndexForInsertionSlot,
  type BatchCopyItem,
} from "@/entities/batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { GripIcon, RemoveIcon } from "@/shared/ui/icons"

type PointerDrag = {
  active: boolean
  itemId: string
  originalIndex: number
  outside: boolean
  pointerId: number
  startClientX: number
  startClientY: number
  threshold: number
  targetIndex: number | null
}

type ReorderAnnouncement = {
  id: number
  message: string
}

const POINTER_DRAG_THRESHOLD_PX = 5
const TOUCH_DRAG_THRESHOLD_PX = 10

type BatchCopyListProps = {
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  selectedItemId?: string | null
  onMove(itemId: string, index: number): Promise<boolean>
  onRemove(itemId: string): void
  onToggleSelection?(itemId: string): void
}

type PointerDragControlProps = {
  onDragKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLButtonElement>): void
}

type PanelBatchCopyItemProps = PointerDragControlProps & {
  dragging: boolean
  dropTarget: boolean
  item: BatchCopyItem
  outside: boolean
  pending: boolean
  position: number
  selected: boolean
  onRegisterButton(itemId: string, element: HTMLButtonElement | null): void
  onRemove(itemId: string): void
  onSelect(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ): void
  onSelectedItemKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ): void
}

type ManagementBatchCopyItemProps = PointerDragControlProps & {
  dragging: boolean
  dropTarget: boolean
  item: BatchCopyItem
  pending: boolean
  position: number
  total: number
  onChoosePosition(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ): void
  onMove(itemId: string, index: number): Promise<boolean>
  onRemove(itemId: string): void
}

type BatchCopyInsertionTargetProps = {
  currentIndex: number
  disabled: boolean
  itemCount: number
  slot: number
  onSelect(itemIndex: number): void
}

type PanelBatchCopyItemsProps = PointerDragControlProps & {
  drag: PointerDrag | null
  items: readonly BatchCopyItem[]
  listRef: RefObject<HTMLOListElement | null>
  pending: boolean
  selectedItemId: string | null
  onRegisterButton(itemId: string, element: HTMLButtonElement | null): void
  onRemove(itemId: string): void
  onSelect(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ): void
  onSelectedItemKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ): void
}

type ManagementBatchCopyItemsProps = PointerDragControlProps & {
  drag: PointerDrag | null
  items: readonly BatchCopyItem[]
  listRef: RefObject<HTMLOListElement | null>
  pending: boolean
  placementActive: boolean
  placementIndex: number
  onChoosePosition(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ): void
  onMove(itemId: string, index: number): Promise<boolean>
  onMoveToInsertion(itemIndex: number): void
  onRemove(itemId: string): void
}

function BatchCopyInsertionTarget({
  currentIndex,
  disabled,
  itemCount,
  onSelect,
  slot,
}: BatchCopyInsertionTargetProps) {
  const itemIndex = itemIndexForInsertionSlot(
    currentIndex,
    slot,
    itemCount,
  )
  const unavailable = disabled || itemIndex === null
  const positionText = (slot + 1).toLocaleString("ko-KR")
  const accessibleName = `${positionText}번째 삽입 위치`

  function select() {
    if (itemIndex !== null) {
      onSelect(itemIndex)
    }
  }

  return (
    <li role="presentation">
      <button
        aria-label={accessibleName}
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
    </li>
  )
}

function PanelBatchCopyItem({
  dragging,
  dropTarget,
  item,
  onDragKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRegisterButton,
  onRemove,
  onSelect,
  onSelectedItemKeyDown,
  outside,
  pending,
  position,
  selected,
}: PanelBatchCopyItemProps) {
  const text = item.textSnapshot || "빈 메모"
  const selectionLabel = `일괄 복사 항목 선택: ${text}`
  const removeLabel = `일괄 복사 항목 제거: ${text}`
  const showRemovalStatus = dragging && outside
  const itemClassName = joinClassNames(
    "group relative grid grid-cols-[minmax(0,1fr)_auto] items-start rounded-control border border-line bg-surface transition-[border-color,opacity,outline-color,transform]",
    selected ? "border-selection ring-1 ring-inset ring-selection" : undefined,
    dragging ? "scale-[0.99] opacity-80" : undefined,
    showRemovalStatus ? "border-danger bg-danger/5" : undefined,
    dropTarget ? "border-action outline-dashed outline-2 outline-offset-2 outline-action" : undefined,
  )

  function registerButton(element: HTMLButtonElement | null) {
    onRegisterButton(item.id, element)
  }

  function selectItem(event: ReactMouseEvent<HTMLButtonElement>) {
    onSelect(event, item.id)
  }

  function removeItem() {
    onRemove(item.id)
  }

  function startPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    onPointerDown(event, item.id, position)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    onDragKeyDown(event)
    onSelectedItemKeyDown(event, item.id, position)
  }

  return (
    <li
      className={itemClassName}
      data-batch-copy-position={position}
    >
      <button
        aria-label={selectionLabel}
        aria-pressed={selected}
        className="block min-h-16 w-full touch-none rounded-control bg-transparent p-3 text-left text-sm leading-6 text-ink focus-visible:outline focus-visible:outline-[0.2rem] focus-visible:outline-offset-[-0.2rem] focus-visible:outline-[var(--notes-focus-ring)] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={pending}
        onClick={selectItem}
        onKeyDown={handleKeyDown}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={startPointerDrag}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={registerButton}
        type="button"
      >
        <span className="whitespace-pre-wrap break-words">{text}</span>
        {showRemovalStatus ? (
          <span className="mt-2 block text-xs font-semibold text-danger" role="status">
            패널 밖에 놓으면 제거됩니다.
          </span>
        ) : null}
      </button>
      <div className="mr-2 mt-2">
        <IconButton
          aria-label={removeLabel}
          className="pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100"
          disabled={pending}
          onClick={removeItem}
          size="compact"
          tone="danger"
        >
          <RemoveIcon />
        </IconButton>
      </div>
    </li>
  )
}

function ManagementBatchCopyItem({
  dragging,
  dropTarget,
  item,
  onChoosePosition,
  onDragKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onMove,
  onRemove,
  pending,
  position,
  total,
}: ManagementBatchCopyItemProps) {
  const positionText = (position + 1).toLocaleString("ko-KR")
  const handleLabel = `${positionText}번째 일괄 복사 항목 위치 변경`
  const text = item.textSnapshot || "빈 메모"
  const itemClassName = joinClassNames(
    "group relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-control border border-line bg-surface p-3 transition-[border-color,opacity,outline-color,transform]",
    dragging ? "scale-[0.99] opacity-80" : undefined,
    dropTarget ? "border-action outline-dashed outline-2 outline-offset-2 outline-action" : undefined,
  )
  function choosePosition(event: ReactMouseEvent<HTMLButtonElement>) {
    onChoosePosition(event, item.id)
  }

  function moveUp() {
    void onMove(item.id, position - 1)
  }

  function moveDown() {
    void onMove(item.id, position + 1)
  }

  function removeItem() {
    onRemove(item.id)
  }

  function startPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    onPointerDown(event, item.id, position)
  }

  return (
    <li
      className={itemClassName}
      data-batch-copy-position={position}
    >
      <button
        aria-label={handleLabel}
        className="min-h-10 min-w-10 touch-none cursor-grab rounded-control border border-line bg-surface-raised text-soft-ink active:cursor-grabbing"
        disabled={pending}
        onClick={choosePosition}
        onKeyDown={onDragKeyDown}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={startPointerDrag}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <GripIcon />
      </button>
      <div className="min-w-0">
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {text}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            disabled={pending || position === 0}
            onClick={moveUp}
            tone="quiet"
          >
            위로
          </Button>
          <Button
            disabled={pending || position === total - 1}
            onClick={moveDown}
            tone="quiet"
          >
            아래로
          </Button>
          <Button disabled={pending} onClick={removeItem} tone="quiet">
            제거
          </Button>
        </div>
      </div>
    </li>
  )
}

function PanelBatchCopyItems({
  drag,
  items,
  listRef,
  onDragKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRegisterButton,
  onRemove,
  onSelect,
  onSelectedItemKeyDown,
  pending,
  selectedItemId,
}: PanelBatchCopyItemsProps) {
  return (
    <ol className="grid gap-2" ref={listRef}>
      {items.map((item, position) => {
        const dragging = drag?.itemId === item.id
        const dropTarget = drag?.targetIndex === position
        const selected = selectedItemId === item.id
        const outside = dragging && drag?.outside === true

        return (
          <PanelBatchCopyItem
            dragging={dragging}
            dropTarget={dropTarget}
            item={item}
            key={item.id}
            onDragKeyDown={onDragKeyDown}
            onPointerCancel={onPointerCancel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onRegisterButton={onRegisterButton}
            onRemove={onRemove}
            onSelect={onSelect}
            onSelectedItemKeyDown={onSelectedItemKeyDown}
            outside={outside}
            pending={pending}
            position={position}
            selected={selected}
          />
        )
      })}
    </ol>
  )
}

function ManagementBatchCopyItems({
  drag,
  items,
  listRef,
  onChoosePosition,
  onDragKeyDown,
  onMove,
  onMoveToInsertion,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRemove,
  pending,
  placementActive,
  placementIndex,
}: ManagementBatchCopyItemsProps) {
  const itemCount = items.length

  return (
    <ol className="grid gap-2" ref={listRef}>
      {items.map((item, position) => {
        const dragging = drag?.itemId === item.id
        const dropTarget = drag?.targetIndex === position

        return (
          <Fragment key={item.id}>
            {placementActive ? (
              <BatchCopyInsertionTarget
                currentIndex={placementIndex}
                disabled={pending}
                itemCount={itemCount}
                onSelect={onMoveToInsertion}
                slot={position}
              />
            ) : null}
            <ManagementBatchCopyItem
              dragging={dragging}
              dropTarget={dropTarget}
              item={item}
              onChoosePosition={onChoosePosition}
              onDragKeyDown={onDragKeyDown}
              onMove={onMove}
              onPointerCancel={onPointerCancel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onRemove={onRemove}
              pending={pending}
              position={position}
              total={itemCount}
            />
          </Fragment>
        )
      })}
      {placementActive ? (
        <BatchCopyInsertionTarget
          currentIndex={placementIndex}
          disabled={pending}
          itemCount={itemCount}
          onSelect={onMoveToInsertion}
          slot={itemCount}
        />
      ) : null}
    </ol>
  )
}

function pointOutside(element: HTMLElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect()
  const outsideHorizontal = clientX < bounds.left || clientX > bounds.right
  const outsideVertical = clientY < bounds.top || clientY > bounds.bottom
  return outsideHorizontal || outsideVertical
}

function itemIndexAtPoint(
  list: HTMLOListElement,
  clientX: number,
  clientY: number,
) {
  const hit = document.elementFromPoint(clientX, clientY)

  if (!(hit instanceof Element)) {
    return null
  }

  const item = hit.closest<HTMLElement>("[data-batch-copy-position]")

  if (item === null || !list.contains(item)) {
    return null
  }

  const position = Number(item.dataset.batchCopyPosition)
  return Number.isInteger(position) ? position : null
}

export function BatchCopyList({
  items,
  onMove,
  onRemove,
  onToggleSelection,
  pending,
  presentation,
  selectedItemId = null,
}: BatchCopyListProps) {
  const list = useRef<HTMLOListElement>(null)
  const dragSession = useRef<PointerDrag | null>(null)
  const suppressPointerClick = useRef(false)
  const itemButtons = useRef(new Map<string, HTMLButtonElement>())
  const announcementId = useRef(0)
  const focusFrame = useRef<number | null>(null)
  const [announcement, setAnnouncement] =
    useState<ReorderAnnouncement | null>(null)
  const [drag, setDrag] = useState<PointerDrag | null>(null)
  const [placementItemId, setPlacementItemId] = useState<string | null>(null)
  const placementIndex = items.findIndex(({ id }) => id === placementItemId)
  const placementActive = placementIndex >= 0

  useEffect(() => {
    return () => {
      if (focusFrame.current !== null) {
        cancelAnimationFrame(focusFrame.current)
      }
    }
  }, [])

  function updateDrag(nextDrag: PointerDrag | null) {
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

    suppressPointerClick.current = false
    const threshold = event.pointerType === "touch"
      ? TOUCH_DRAG_THRESHOLD_PX
      : POINTER_DRAG_THRESHOLD_PX
    dragSession.current = {
      active: false,
      itemId,
      originalIndex: position,
      outside: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      threshold,
      targetIndex: null,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function movePointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current
    const listElement = list.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    if (listElement === null) {
      return
    }

    const panelBoundary = event.currentTarget.closest<HTMLElement>(
      "[data-batch-copy-panel-boundary]",
    )
    const boundary = presentation === "panel" ? panelBoundary : listElement
    const outsidePanel = boundary !== null && pointOutside(
      boundary,
      event.clientX,
      event.clientY,
    )
    const outside = presentation === "panel" && outsidePanel
    const hitIndex = outside
      ? null
      : itemIndexAtPoint(listElement, event.clientX, event.clientY)
    const overAnotherItem = hitIndex !== null && hitIndex !== current.originalIndex
    const targetIndex = overAnotherItem ? hitIndex : null
    const horizontalDistance = event.clientX - current.startClientX
    const verticalDistance = event.clientY - current.startClientY
    const distanceSquared =
      horizontalDistance * horizontalDistance + verticalDistance * verticalDistance
    const dragThresholdSquared = current.threshold * current.threshold
    const passedThreshold = distanceSquared >= dragThresholdSquared
    const enteredDropState = outside || targetIndex !== null
    const active = current.active || passedThreshold || enteredDropState
    const nextDrag = { ...current, active, outside, targetIndex }

    if (!current.active && active && presentation === "panel") {
      if (selectedItemId !== current.itemId) {
        onToggleSelection?.(current.itemId)
      }
    }

    dragSession.current = nextDrag
    setDrag(active ? nextDrag : null)
  }

  function finishPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    suppressPointerClick.current = current.active
    updateDrag(null)

    if (current.outside && presentation === "panel") {
      onRemove(current.itemId)
    } else if (current.targetIndex !== null) {
      void onMove(current.itemId, current.targetIndex)
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragSession.current

    if (current?.pointerId !== event.pointerId) {
      return
    }

    suppressPointerClick.current = true
    updateDrag(null)
  }

  function cancelDragFromKeyboard(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    const current = dragSession.current

    if (event.key !== "Escape" || current === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    suppressPointerClick.current = true
    updateDrag(null)

    if (event.currentTarget.hasPointerCapture(current.pointerId)) {
      event.currentTarget.releasePointerCapture(current.pointerId)
    }
  }

  function consumeSuppressedPointerClick(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    if (!suppressPointerClick.current) {
      return false
    }

    suppressPointerClick.current = false
    return event.detail !== 0
  }

  function selectPanelItem(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ) {
    if (consumeSuppressedPointerClick(event)) {
      return
    }

    onToggleSelection?.(itemId)
  }

  function choosePosition(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ) {
    if (consumeSuppressedPointerClick(event)) {
      return
    }

    setPlacementItemId(itemId)
  }

  async function moveToInsertion(itemIndex: number) {
    if (placementItemId === null) {
      return
    }

    const saved = await onMove(placementItemId, itemIndex)

    if (saved) {
      setPlacementItemId(null)
    }
  }

  function moveToInsertionWithoutWaiting(itemIndex: number) {
    void moveToInsertion(itemIndex)
  }

  function cancelPositionChoice() {
    setPlacementItemId(null)
  }

  function registerItemButton(
    itemId: string,
    element: HTMLButtonElement | null,
  ) {
    if (element === null) {
      itemButtons.current.delete(itemId)
      return
    }

    itemButtons.current.set(itemId, element)
  }

  async function moveSelectedItem(itemId: string, targetIndex: number) {
    const saved = await onMove(itemId, targetIndex)

    if (!saved) {
      return
    }

    const positionText = (targetIndex + 1).toLocaleString("ko-KR")
    const totalText = items.length.toLocaleString("ko-KR")
    announcementId.current += 1
    setAnnouncement({
      id: announcementId.current,
      message: `일괄 복사 항목을 ${positionText}번째로 옮겼습니다. 전체 ${totalText}개입니다.`,
    })

    if (focusFrame.current !== null) {
      cancelAnimationFrame(focusFrame.current)
    }

    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null
      itemButtons.current.get(itemId)?.focus()
    })
  }

  function handleSelectedItemKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
    position: number,
  ) {
    const upward = event.key === "ArrowUp"
    const downward = event.key === "ArrowDown"
    const arrowKey = upward || downward

    if (!arrowKey || selectedItemId !== itemId) {
      return
    }

    event.preventDefault()
    const offset = upward ? -1 : 1
    const targetIndex = position + offset
    const outsideStart = targetIndex < 0
    const outsideEnd = targetIndex >= items.length

    if (outsideStart || outsideEnd) {
      return
    }

    void moveSelectedItem(itemId, targetIndex)
  }

  if (presentation === "panel") {
    return (
      <div className="grid gap-2">
        <p aria-live="polite" className="sr-only">
          {announcement === null ? null : (
            <span key={announcement.id}>{announcement.message}</span>
          )}
        </p>
        <PanelBatchCopyItems
          drag={drag}
          items={items}
          listRef={list}
          onDragKeyDown={cancelDragFromKeyboard}
          onPointerCancel={cancelPointer}
          onPointerDown={startPointerDrag}
          onPointerMove={movePointer}
          onPointerUp={finishPointer}
          onRegisterButton={registerItemButton}
          onRemove={onRemove}
          onSelect={selectPanelItem}
          onSelectedItemKeyDown={handleSelectedItemKeyDown}
          pending={pending}
          selectedItemId={selectedItemId}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {placementActive ? (
        <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-raised px-3 py-2">
          <p className="text-sm font-semibold">옮길 위치를 선택하세요.</p>
          <Button onClick={cancelPositionChoice} tone="quiet">
            취소
          </Button>
        </div>
      ) : null}
      <ManagementBatchCopyItems
        drag={drag}
        items={items}
        listRef={list}
        onChoosePosition={choosePosition}
        onDragKeyDown={cancelDragFromKeyboard}
        onMove={onMove}
        onMoveToInsertion={moveToInsertionWithoutWaiting}
        onPointerCancel={cancelPointer}
        onPointerDown={startPointerDrag}
        onPointerMove={movePointer}
        onPointerUp={finishPointer}
        onRemove={onRemove}
        pending={pending}
        placementActive={placementActive}
        placementIndex={placementIndex}
      />
    </div>
  )
}
