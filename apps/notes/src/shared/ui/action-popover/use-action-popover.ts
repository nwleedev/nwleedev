"use client"

import {
  useId,
  useRef,
  useState,
  type SyntheticEvent,
} from "react"

type PopoverPosition = {
  left: number
  top: number
}

const popoverMargin = 12
const popoverGap = 6

export function useActionPopover() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<PopoverPosition>({ left: 0, top: 0 })

  function placePopover(popover: HTMLDivElement) {
    const trigger = triggerRef.current

    if (trigger === null) {
      return
    }

    const bounds = trigger.getBoundingClientRect()
    const popoverBounds = popover.getBoundingClientRect()
    const maximumLeft = window.innerWidth - popoverBounds.width - popoverMargin
    const unclampedLeft = bounds.right - popoverBounds.width
    const left = Math.max(popoverMargin, Math.min(unclampedLeft, maximumLeft))
    const spaceBelow = window.innerHeight - bounds.bottom - popoverMargin
    const below = spaceBelow >= popoverBounds.height
    const preferredTop = below
      ? bounds.bottom + popoverGap
      : bounds.top - popoverBounds.height - popoverGap
    const maximumTop = Math.max(
      popoverMargin,
      window.innerHeight - popoverBounds.height - popoverMargin,
    )
    const top = Math.max(popoverMargin, Math.min(preferredTop, maximumTop))

    setPosition({ left, top })
  }

  function close() {
    const popover = popoverRef.current

    if (popover?.matches(":popover-open")) {
      popover.hidePopover()
    }
  }

  function handleToggle(event: SyntheticEvent<HTMLDivElement>) {
    const popover = event.currentTarget
    const open = popover.matches(":popover-open")

    setExpanded(open)
    if (open) {
      placePopover(popover)
    }
    requestAnimationFrame(() => {
      if (open) {
        if (popover.isConnected) {
          popover.querySelector<HTMLButtonElement>("button")?.focus()
        }
        return
      }

      const activeElement = document.activeElement
      const focusStayedInPopover =
        activeElement === document.body ||
        popover.contains(activeElement)

      if (focusStayedInPopover && triggerRef.current?.isConnected) {
        triggerRef.current?.focus()
      }
    })
  }

  return {
    close,
    expanded,
    handleToggle,
    popoverId,
    popoverRef,
    popoverStyle: { left: position.left, top: position.top },
    triggerRef,
  }
}
