"use client"

import {
  ActionPopover,
  type ActionPopoverAction,
} from "@/shared/ui/action-popover"

type BatchCopyItemActionsProps = {
  disabled: boolean
  itemLabel: string
  onDelete(): void
  onDuplicate(): void
  onMove(): void
}

export function BatchCopyItemActions({
  disabled,
  itemLabel,
  onDelete,
  onDuplicate,
  onMove,
}: BatchCopyItemActionsProps) {
  const actions: readonly ActionPopoverAction[] = [
    {
      icon: "move",
      id: "move",
      label: "위치 변경",
      onSelect: onMove,
    },
    {
      icon: "duplicate",
      id: "duplicate",
      label: "복제",
      onSelect: onDuplicate,
    },
    {
      icon: "remove",
      id: "remove",
      label: "삭제",
      onSelect: onDelete,
      tone: "danger",
    },
  ]

  return (
    <ActionPopover
      actions={actions}
      disabled={disabled}
      label={`${itemLabel} 동작`}
    />
  )
}
