export type BatchCopyItemAction = {
  id: "move-up" | "move-down" | "duplicate" | "remove"
  icon: "up" | "down" | "duplicate" | "remove"
  label: string
  onSelect(): void
  tone?: "danger"
}

type BatchCopyItemActionOptions = {
  canMoveDown: boolean
  canMoveUp: boolean
  onDuplicate(): void
  onMoveDown(): void
  onMoveUp(): void
  onRemove(): void
}

export function createBatchCopyItemActions({
  canMoveDown,
  canMoveUp,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: BatchCopyItemActionOptions): BatchCopyItemAction[] {
  const actions: BatchCopyItemAction[] = []

  if (canMoveUp) {
    actions.push({
      icon: "up",
      id: "move-up",
      label: "위로 이동",
      onSelect: onMoveUp,
    })
  }

  if (canMoveDown) {
    actions.push({
      icon: "down",
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
      onSelect: onRemove,
      tone: "danger",
    },
  )

  return actions
}
