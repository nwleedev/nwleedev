type DropIndicatorProps = {
  placement: "after" | "before" | null
  end: "left" | "right"
}

export function DropIndicator({ placement, end }: DropIndicatorProps) {
  if (placement === null) return null

  return <span aria-hidden="true" className="notes-drop-indicator" data-placement={placement} data-end={end} />
}
