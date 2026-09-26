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
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { GripIcon, MoreIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"

import { createBatchCopyItemActions } from "../model/batch-copy-item-actions"
import type { EditBatchCopyResult } from "../model/save-changes"
import { useBatchCopyActionSheet } from "../model/use-batch-copy-action-sheet"
import { useBatchCopyEditing } from "../model/use-batch-copy-editing"
import { useBatchCopyPointerReorder } from "../model/use-batch-copy-pointer-reorder"
import { BatchCopyActionSheet } from "./batch-copy-action-sheet"

type BatchCopyListProps = {
  actionPresentation: "popover" | "sheet" | null
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  reorderButtonsEnabled: boolean
  selectedItemId?: string | null
  onDuplicate(itemId: string): Promise<EditBatchCopyResult>
  onMove(itemId: string, index: number): Promise<EditBatchCopyResult>
  onRemove(itemId: string): Promise<EditBatchCopyResult>
  onToggleSelection?(itemId: string): void
}

type BatchCopyRowProps = {
  actionPresentation: "popover" | "sheet" | null
  actionsOpen: boolean
  dragging: boolean
  dropPlacement: "after" | "before" | null
  item: BatchCopyItem
  outside: boolean
  pending: boolean
  position: number
  presentation: "management" | "panel"
  selected: boolean
  popoverActions: readonly ActionPopoverAction[]
  onOpenActions(itemId: string): void
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
  onRegisterActionTrigger(itemId: string, element: HTMLButtonElement | null): void
  onToggleSelection?(itemId: string): void
}

function BatchCopyRow({
  actionPresentation,
  actionsOpen,
  dragging,
  dropPlacement,
  item,
  onKeyDown,
  onOpenActions,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRegisterHandle,
  onRegisterActionTrigger,
  onToggleSelection,
  outside,
  pending,
  position,
  popoverActions,
  presentation,
  selected,
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

  function registerActionTrigger(element: HTMLButtonElement | null) {
    onRegisterActionTrigger(item.id, element)
  }

  function openActions() {
    onOpenActions(item.id)
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
      {actionPresentation === "popover" ? (
        <ActionPopover
          actions={popoverActions}
          disabled={pending}
          label={`${itemLabel} 동작`}
        />
      ) : null}
      {actionPresentation === "sheet" ? (
        <IconButton
          aria-expanded={actionsOpen}
          aria-haspopup="dialog"
          aria-label={`${itemLabel} 동작`}
          disabled={pending}
          onClick={openActions}
          ref={registerActionTrigger}
          size="compact"
        >
          <MoreIcon />
        </IconButton>
      ) : null}
      {dragging && outside ? (
        <p className="col-span-3 text-xs font-semibold text-danger" role="status">
          패널 밖에 놓으면 삭제됩니다.
        </p>
      ) : null}
    </li>
  )
}

export function BatchCopyList({
  actionPresentation,
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
  const editing = useBatchCopyEditing({ items, onDuplicate, onMove, onRemove })
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
    items: editing.items,
    onMove: editing.move,
    onRemove: editing.remove,
    onToggleSelection,
    pending,
    presentation,
    selectedItemId,
  })
  const actionSheet = useBatchCopyActionSheet(
    editing.items.map(({ id }) => id),
    list,
  )
  const activePosition = editing.items.findIndex(
    ({ id }) => id === actionSheet.activeItemId,
  )
  const activeItem = editing.items[activePosition]
  const activeLabel = activePosition >= 0
    ? `${(activePosition + 1).toLocaleString("ko-KR")}번째 일괄 복사 항목`
    : "일괄 복사 항목 동작"

  function actionsFor(item: BatchCopyItem, position: number) {
    return createBatchCopyItemActions({
      canMoveDown: reorderButtonsEnabled && position < editing.items.length - 1,
      canMoveUp: reorderButtonsEnabled && position > 0,
      onDuplicate: () => editing.duplicate(item.id),
      onMoveDown: () => { moveBy(item.id, position, 1) },
      onMoveUp: () => { moveBy(item.id, position, -1) },
      onRemove: () => editing.remove(item.id),
    })
  }

  const activeActions = activeItem === undefined
    ? []
    : actionsFor(activeItem, activePosition)

  return (
    <div className="grid gap-3">
      {editing.failure !== null ? (
        <StatusNotice kind="error">
          <p>{editing.failure.message}</p>
          <Button onClick={editing.failure.retry} tone="quiet">
            다시 시도
          </Button>
        </StatusNotice>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol className="grid gap-2" ref={list} tabIndex={-1}>
        {editing.items.map((item, position) => {
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
              actionPresentation={actionPresentation}
              actionsOpen={actionSheet.activeItemId === item.id}
              dragging={dragging}
              dropPlacement={dropPlacement}
              item={item}
              key={item.id}
              onKeyDown={onKeyDown}
              onOpenActions={actionSheet.open}
              onPointerCancel={onPointerCancel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onRegisterHandle={registerHandle}
              onRegisterActionTrigger={actionSheet.registerTrigger}
              onToggleSelection={onToggleSelection}
              outside={dragging && drag?.outside === true}
              pending={pending}
              position={position}
              popoverActions={
                actionPresentation === "popover"
                  ? actionsFor(item, position)
                  : []
              }
              presentation={presentation}
              selected={selectedItemId === item.id}
            />
          )
        })}
      </ol>
      <BatchCopyActionSheet
        actions={activeActions}
        itemLabel={activeLabel}
        onClose={actionSheet.closed}
        onRun={actionSheet.run}
        open={actionPresentation === "sheet" && activeItem !== undefined && !pending}
      />
    </div>
  )
}
