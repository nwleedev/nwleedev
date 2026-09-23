"use client"

import type { PointerEvent as ReactPointerEvent } from "react"

import type { MobileBatchCopyEntry } from "@/entities/batch-copy"
import {
  BatchCopyActionSheet,
  createBatchCopyItemActions,
  useBatchCopyActionSheet,
} from "@/features/edit-batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { IconButton } from "@/shared/ui/icon-button"
import { GripIcon, MoreIcon } from "@/shared/ui/icons"

import { useMobileBatchCopyPointerReorder } from "../model/use-mobile-batch-copy-pointer-reorder"

type MobileBatchCopyConfirmationListProps = {
  disabled: boolean
  entries: readonly MobileBatchCopyEntry[]
  onDuplicate(entryId: string): void
  onMove(entryId: string, index: number): Promise<boolean>
  onRemove(entryId: string): void
  reorderButtonsEnabled: boolean
}

type MobileBatchCopyEntryRowProps = {
  disabled: boolean
  dragging: boolean
  dropPlacement: "after" | "before" | null
  entry: MobileBatchCopyEntry
  position: number
  actionsOpen: boolean
  onOpenActions(entryId: string): void
  onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    entryId: string,
    index: number,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLButtonElement>): void
  onRegisterHandle(entryId: string, element: HTMLButtonElement | null): void
  onRegisterActionTrigger(entryId: string, element: HTMLButtonElement | null): void
}

function MobileBatchCopyEntryRow({
  disabled,
  dragging,
  dropPlacement,
  entry,
  actionsOpen,
  onOpenActions,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRegisterHandle,
  onRegisterActionTrigger,
  position,
}: MobileBatchCopyEntryRowProps) {
  const positionText = (position + 1).toLocaleString("ko-KR")
  const itemLabel = `${positionText}번째 일괄 복사 항목`
  const articleClassName = joinClassNames(
    "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-note border border-border bg-surface-raised p-3 text-sm leading-6 text-ink transition-[border-color,box-shadow,transform]",
    dragging ? "-translate-y-1 border-action shadow-floating" : undefined,
    dropPlacement === "before"
      ? "before:absolute before:-top-2 before:left-1 before:right-1 before:h-1 before:rounded-full before:bg-action"
      : undefined,
    dropPlacement === "after"
      ? "after:absolute after:-bottom-2 after:left-1 after:right-1 after:h-1 after:rounded-full after:bg-action"
      : undefined,
  )

  function registerHandle(element: HTMLButtonElement | null) {
    onRegisterHandle(entry.id, element)
  }

  function beginPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    onPointerDown(event, entry.id, position)
  }

  function registerActionTrigger(element: HTMLButtonElement | null) {
    onRegisterActionTrigger(entry.id, element)
  }

  function openActions() {
    onOpenActions(entry.id)
  }

  return (
    <li data-mobile-batch-copy-position={position}>
      <article aria-label={itemLabel} className={articleClassName}>
        <button
          aria-label={`${itemLabel} 이동`}
          className="flex min-h-11 min-w-11 touch-pan-y cursor-grab items-center justify-center rounded-control border-0 bg-transparent text-icon active:cursor-grabbing disabled:opacity-45"
          disabled={disabled}
          onLostPointerCapture={onPointerCancel}
          onPointerCancel={onPointerCancel}
          onPointerDown={beginPointer}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          ref={registerHandle}
          type="button"
        >
          <GripIcon />
        </button>
        <p className="min-w-0 whitespace-pre-wrap break-words py-2">
          {entry.textSnapshot || "빈 메모"}
        </p>
        <IconButton
          aria-expanded={actionsOpen}
          aria-haspopup="dialog"
          aria-label={`${itemLabel} 동작`}
          disabled={disabled}
          onClick={openActions}
          ref={registerActionTrigger}
          size="compact"
        >
          <MoreIcon />
        </IconButton>
      </article>
    </li>
  )
}

export function MobileBatchCopyConfirmationList({
  disabled,
  entries,
  onDuplicate,
  onMove,
  onRemove,
  reorderButtonsEnabled,
}: MobileBatchCopyConfirmationListProps) {
  const {
    announcement,
    drag,
    list,
    moveBy,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    registerHandle,
  } = useMobileBatchCopyPointerReorder({ disabled, entries, onMove })
  const actionSheet = useBatchCopyActionSheet(entries.map(({ id }) => id), list)
  const activePosition = entries.findIndex(({ id }) => id === actionSheet.activeItemId)
  const activeEntry = entries[activePosition]
  const activeLabel = activePosition >= 0
    ? `${(activePosition + 1).toLocaleString("ko-KR")}번째 일괄 복사 항목`
    : "일괄 복사 항목 동작"
  const actions = createBatchCopyItemActions({
    canMoveDown: reorderButtonsEnabled && activePosition >= 0 && activePosition < entries.length - 1,
    canMoveUp: reorderButtonsEnabled && activePosition > 0,
    onDuplicate: () => {
      if (activeEntry) onDuplicate(activeEntry.id)
    },
    onMoveDown: () => {
      if (activeEntry) moveBy(activeEntry.id, activePosition, 1)
    },
    onMoveUp: () => {
      if (activeEntry) moveBy(activeEntry.id, activePosition, -1)
    },
    onRemove: () => {
      if (activeEntry) onRemove(activeEntry.id)
    },
  })
  let movingMessage = announcement

  if (drag?.targetIndex === null) {
    movingMessage = "놓을 수 없는 위치"
  } else if (drag !== null) {
    const targetPosition = (drag.targetIndex + 1).toLocaleString("ko-KR")
    movingMessage = `${targetPosition}번째 위치로 이동 중`
  }

  return (
    <div className="grid gap-3">
      <p aria-live="polite" className="sr-only" role="status">
        {movingMessage}
      </p>
      <ol className="grid gap-3" ref={list} tabIndex={-1}>
        {entries.map((entry, position) => {
          const dragging = drag?.entryId === entry.id
          const target = drag?.targetIndex === position
          let dropPlacement: "after" | "before" | null = null

          if (target && drag.targetIndex !== null) {
            dropPlacement = drag.targetIndex < drag.sourceIndex
              ? "before"
              : "after"
          }

          return (
            <MobileBatchCopyEntryRow
              disabled={disabled}
              dragging={dragging}
              dropPlacement={dropPlacement}
              entry={entry}
              key={entry.id}
              actionsOpen={actionSheet.activeItemId === entry.id}
              onOpenActions={actionSheet.open}
              onPointerCancel={onPointerCancel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onRegisterHandle={registerHandle}
              onRegisterActionTrigger={actionSheet.registerTrigger}
              position={position}
            />
          )
        })}
      </ol>
      <BatchCopyActionSheet
        actions={actions}
        itemLabel={activeLabel}
        onClose={actionSheet.closed}
        onRun={actionSheet.run}
        open={activeEntry !== undefined && !disabled}
      />
    </div>
  )
}
