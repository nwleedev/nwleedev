"use client"

import {
  ActionPopover,
  type ActionPopoverAction,
} from "@/shared/ui/action-popover"

type BatchCopyItemActionsProps = {
  canMoveDown: boolean
  canMoveUp: boolean
  disabled: boolean
  itemLabel: string
  onDelete(): void
  onDuplicate(): void
  onMoveDown(): void
  onMoveUp(): void
}

export function BatchCopyItemActions({
  canMoveDown,
  canMoveUp,
  disabled,
  itemLabel,
  onDelete,
  onDuplicate,
  onMoveDown,
  onMoveUp,
}: BatchCopyItemActionsProps) {
  const actions: ActionPopoverAction[] = []

  if (canMoveUp) {
    actions.push({
      icon: "move",
      id: "move-up",
      label: "위로 이동",
      onSelect: onMoveUp,
    })
  }

  if (canMoveDown) {
    actions.push({
      icon: "move",
      id: "move-down",
      label: "아래로 이동",
      onSelect: onMoveDown,
    })
  }

  actions.push(
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
  )

  return (
    <ActionPopover
      actions={actions}
      disabled={disabled}
      label={`${itemLabel} 동작`}
    />
  )
}
