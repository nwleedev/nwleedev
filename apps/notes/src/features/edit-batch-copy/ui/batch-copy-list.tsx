"use client"

import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import {
  ActionPopover,
  type ActionPopoverAction,
} from "@/shared/ui/action-popover"
import { GripIcon } from "@/shared/ui/icons"

import { useBatchCopyPointerReorder } from "../model/use-batch-copy-pointer-reorder"

type BatchCopyListProps = {
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  reorderButtonsEnabled: boolean
  selectedItemId?: string | null
  onDuplicate(itemId: string): void
  onMove(itemId: string, index: number): Promise<boolean>
  onRemove(itemId: string): void
  onToggleSelection?(itemId: string): void
}

type BatchCopyRowProps = {
  dragging: boolean
  dropPlacement: "after" | "before" | null
  item: BatchCopyItem
  outside: boolean
  pending: boolean
  position: number
  presentation: "management" | "panel"
  reorderButtonsEnabled: boolean
  selected: boolean
  onDuplicate(itemId: string): void
  onKeyDown(
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
  onRegisterHandle(itemId: string, element: HTMLButtonElement | null): void
  onRemove(itemId: string): void
  onMoveBy(itemId: string, position: number, offset: -1 | 1): boolean
  onToggleSelection?(itemId: string): void
  totalItems: number
}

function BatchCopyRow({
  dragging,
  dropPlacement,
  item,
  onDuplicate,
  onKeyDown,
  onMoveBy,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRegisterHandle,
  onRemove,
  onToggleSelection,
  outside,
  pending,
  position,
  presentation,
  reorderButtonsEnabled,
  selected,
  totalItems,
}: BatchCopyRowProps) {
  const text = item.textSnapshot || "빈 메모"
  const positionText = (position + 1).toLocaleString("ko-KR")
  const itemLabel = `${positionText}번째 일괄 복사 항목`
  const handleLabel = `${itemLabel} 이동`
  const rowClassName = joinClassNames(
    "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-control border border-border bg-surface-raised p-2 transition-[border-color,opacity,transform]",
    selected ? "border-selection ring-1 ring-inset ring-selection" : undefined,
    dragging ? "-translate-y-0.5 border-border-strong opacity-85 shadow-floating" : undefined,
    outside ? "border-danger bg-danger/5" : undefined,
    dropPlacement === "before"
      ? "before:absolute before:-top-1.5 before:left-1 before:right-1 before:h-0.5 before:rounded-full before:bg-accent"
      : undefined,
    dropPlacement === "after"
      ? "after:absolute after:-bottom-1.5 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-accent"
      : undefined,
  )
  const actions: ActionPopoverAction[] = []

  if (reorderButtonsEnabled && position > 0) {
    actions.push({
      icon: "move",
      id: "move-up",
      label: "위로 이동",
      onSelect: () => onMoveBy(item.id, position, -1),
    })
  }

  if (reorderButtonsEnabled && position < totalItems - 1) {
    actions.push({
      icon: "move",
      id: "move-down",
      label: "아래로 이동",
      onSelect: () => onMoveBy(item.id, position, 1),
    })
  }

  actions.push(
    {
      icon: "duplicate",
      id: "duplicate",
      label: "복제",
      onSelect: () => onDuplicate(item.id),
    },
    {
      icon: "remove",
      id: "remove",
      label: "삭제",
      onSelect: () => onRemove(item.id),
      tone: "danger",
    },
  )

  function registerHandle(element: HTMLButtonElement | null) {
    onRegisterHandle(item.id, element)
  }

  function startPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    onPointerDown(event, item.id, position)
  }

  function moveFromKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    onKeyDown(event, item.id, position)
  }

  function selectItem(event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.detail === 0 || !dragging) {
      onToggleSelection?.(item.id)
    }
  }

  return (
    <li
      aria-label={itemLabel}
      className={rowClassName}
      data-batch-copy-position={position}
    >
      <button
        aria-label={handleLabel}
        className="flex min-h-10 min-w-10 touch-none cursor-grab items-center justify-center rounded-control border-0 bg-transparent text-icon active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
        disabled={pending}
        onKeyDown={moveFromKeyboard}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={startPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={registerHandle}
        type="button"
      >
        <GripIcon />
      </button>
      {presentation === "panel" ? (
        <button
          aria-label={`일괄 복사 항목 선택: ${text}`}
          aria-pressed={selected}
          className="min-h-10 min-w-0 whitespace-pre-wrap break-words rounded-control border-0 bg-transparent px-1 py-2 text-left text-sm leading-6 text-text disabled:opacity-45"
          disabled={pending}
          onClick={selectItem}
          type="button"
        >
          {text}
        </button>
      ) : (
        <p className="min-w-0 whitespace-pre-wrap break-words px-1 py-2 text-sm leading-6 text-text">
          {text}
        </p>
      )}
      <ActionPopover
        actions={actions}
        disabled={pending}
        label={`${itemLabel} 동작`}
      />
      {dragging && outside ? (
        <p className="col-span-3 text-xs font-semibold text-danger" role="status">
          패널 밖에 놓으면 삭제됩니다.
        </p>
      ) : null}
    </li>
  )
}

export function BatchCopyList({
  items,
  onDuplicate,
  onMove,
  onRemove,
  onToggleSelection,
  pending,
  presentation,
  reorderButtonsEnabled,
  selectedItemId = null,
}: BatchCopyListProps) {
  const {
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
  } = useBatchCopyPointerReorder({
    items,
    onMove,
    onRemove,
    onToggleSelection,
    pending,
    presentation,
    selectedItemId,
  })

  return (
    <div className="grid gap-3">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol className="grid gap-2" ref={list}>
        {items.map((item, position) => {
          const dragging = drag?.active === true && drag.itemId === item.id
          const target = drag?.active === true && drag.targetIndex === position
          let dropPlacement: "after" | "before" | null = null

          if (target && drag.targetIndex !== null) {
            dropPlacement = drag.targetIndex < drag.originalIndex
              ? "before"
              : "after"
          }

          return (
            <BatchCopyRow
              dragging={dragging}
              dropPlacement={dropPlacement}
              item={item}
              key={item.id}
              onDuplicate={onDuplicate}
              onKeyDown={onKeyDown}
              onMoveBy={moveBy}
              onPointerCancel={onPointerCancel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onRegisterHandle={registerHandle}
              onRemove={onRemove}
              onToggleSelection={onToggleSelection}
              outside={dragging && drag?.outside === true}
              pending={pending}
              position={position}
              presentation={presentation}
              reorderButtonsEnabled={reorderButtonsEnabled}
              selected={selectedItemId === item.id}
              totalItems={items.length}
            />
          )
        })}
      </ol>
    </div>
  )
}
