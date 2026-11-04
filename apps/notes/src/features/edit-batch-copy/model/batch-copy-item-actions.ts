export type BatchCopyItemAction = {
  id: "move-up" | "move-down" | "move-first" | "move-last" | "duplicate" | "remove"
  icon: "up" | "down" | "first" | "last" | "duplicate" | "remove"
  group?: "copy" | "move" | "remove"
  label: string
  onSelect(): void
  tone?: "danger"
}

type BatchCopyItemActionOptions = {
  canMoveDown: boolean
  canMoveUp: boolean
  ends?: {
    onMoveFirst(): void
    onMoveLast(): void
  }
  onDuplicate(): void
  onMoveDown(): void
  onMoveUp(): void
  onRemove(): void
}

export function createBatchCopyItemActions({
  canMoveDown,
  canMoveUp,
  ends,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: BatchCopyItemActionOptions): BatchCopyItemAction[] {
  const actions: BatchCopyItemAction[] = []

  if (canMoveUp) {
    actions.push({
      group: "move",
      icon: "up",
      id: "move-up",
      label: "위로 이동",
      onSelect: onMoveUp,
    })
  }

  if (canMoveDown) {
    actions.push({
      group: "move",
      icon: "down",
      id: "move-down",
      label: "아래로 이동",
      onSelect: onMoveDown,
    })
  }

  const duplicate: BatchCopyItemAction = { group: "copy", icon: "duplicate", id: "duplicate", label: "복제", onSelect: onDuplicate }

  if (ends !== undefined) {
    if (canMoveUp) {
      actions.push({ group: "move", icon: "first", id: "move-first", label: "맨 위로 이동", onSelect: ends.onMoveFirst })
    }
    if (canMoveDown) {
      actions.push({ group: "move", icon: "last", id: "move-last", label: "맨 아래로 이동", onSelect: ends.onMoveLast })
    }
    actions.unshift(duplicate)
  } else {
    actions.push(duplicate)
  }
  actions.push({ group: "remove", icon: "remove", id: "remove", label: "삭제", onSelect: onRemove, tone: "danger" })

  return actions
}
