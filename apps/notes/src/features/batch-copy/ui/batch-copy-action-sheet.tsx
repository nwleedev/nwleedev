"use client"

import { joinClassNames } from "@/shared/lib/join-class-names"
import { ActionSheet } from "@/shared/ui/action-sheet"
import { IconButton } from "@/shared/ui/icon-button"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DuplicateIcon,
  RemoveIcon,
} from "@/shared/ui/icons"

import type { BatchCopyItemAction } from "../model/batch-copy-item-actions"

type BatchCopyActionSheetProps = {
  actions: readonly BatchCopyItemAction[]
  itemLabel: string
  onClose(): void
  onRun(action: () => void): void
  open: boolean
}

function BatchCopyActionIcon({ icon }: Pick<BatchCopyItemAction, "icon">) {
  if (icon === "up") {
    return <ArrowUpIcon />
  }

  if (icon === "down") {
    return <ArrowDownIcon />
  }

  if (icon === "duplicate") {
    return <DuplicateIcon />
  }

  return <RemoveIcon />
}

export function BatchCopyActionSheet({
  actions,
  itemLabel,
  onClose,
  onRun,
  open,
}: BatchCopyActionSheetProps) {
  const moveActions = actions.filter((action) => action.icon === "up" || action.icon === "down")
  const otherActions = actions.filter((action) => action.icon !== "up" && action.icon !== "down")

  return (
    <ActionSheet label={itemLabel} onClose={onClose} open={open}>
      {moveActions.length > 0 ? (
        <div aria-label="순서 이동" className="flex gap-2 py-2" role="group">
          {moveActions.map((action) => (
            <IconButton
              aria-label={action.label}
              className="min-h-[var(--notes-mobile-action-size)] min-w-[var(--notes-mobile-action-size)] bg-canvas active:bg-feedback active:text-on-accent"
              key={action.id}
              onClick={() => onRun(action.onSelect)}
            >
              <BatchCopyActionIcon icon={action.icon} />
            </IconButton>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1 py-2">
        {otherActions.map((action) => (
          <button
            className={joinClassNames(
              "flex min-h-[var(--notes-mobile-action-size)] items-center gap-3 rounded-control px-3 text-left text-sm font-semibold text-text hover:bg-canvas active:bg-feedback active:text-on-accent",
              action.tone === "danger" ? "text-danger hover:bg-danger/10 active:bg-danger/15" : undefined,
            )}
            key={action.id}
            onClick={() => onRun(action.onSelect)}
            type="button"
          >
            <BatchCopyActionIcon icon={action.icon} />
            {action.label}
          </button>
        ))}
      </div>
    </ActionSheet>
  )
}
