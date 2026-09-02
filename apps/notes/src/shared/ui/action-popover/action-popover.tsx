"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"
import { IconButton } from "@/shared/ui/icon-button"
import {
  DuplicateIcon,
  GripIcon,
  MoreIcon,
  RemoveIcon,
} from "@/shared/ui/icons"

export type ActionPopoverAction = {
  id: string
  icon: "duplicate" | "move" | "remove"
  label: string
  tone?: "danger" | "neutral"
  onSelect(): void
}

type ActionPopoverProps = {
  actions: readonly ActionPopoverAction[]
  disabled: boolean
  label: string
  triggerClassName?: string
}

type ActionPopoverRowProps = {
  action: ActionPopoverAction
  separated: boolean
}

type PopoverPosition = {
  left: number
  top: number
}

const popoverWidth = 176
const popoverEstimatedHeight = 152
const popoverMargin = 12
const popoverGap = 6

function ActionPopoverIcon({ icon }: Pick<ActionPopoverAction, "icon">) {
  if (icon === "duplicate") {
    return <DuplicateIcon />
  }

  if (icon === "remove") {
    return <RemoveIcon />
  }

  return <GripIcon />
}

function ActionPopoverRow({
  action,
  separated,
}: ActionPopoverRowProps) {
  const rowClassName = joinClassNames(
    "flex min-h-10 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-semibold hover:bg-canvas focus-visible:outline focus-visible:outline-[0.2rem] focus-visible:outline-offset-[-0.2rem] focus-visible:outline-[var(--notes-focus-ring)] active:bg-rail",
    action.tone === "danger" ? "text-danger hover:bg-danger/10 active:bg-danger/15" : undefined,
    separated ? "mt-1 border-t border-line pt-2" : undefined,
  )

  return (
    <button
      className={rowClassName}
      data-action-popover-row
      onClick={action.onSelect}
      type="button"
    >
      <ActionPopoverIcon icon={action.icon} />
      {action.label}
    </button>
  )
}

export function ActionPopover({
  actions,
  disabled,
  label,
  triggerClassName,
}: ActionPopoverProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<PopoverPosition>({ left: 0, top: 0 })
  const popoverStyle = { left: position.left, top: position.top }

  function focusTrigger() {
    trigger.current?.focus()
  }

  function closePopover() {
    const element = popover.current

    if (element === null) {
      return
    }

    if (element.matches(":popover-open")) {
      element.hidePopover()
      return
    }

    element.hidden = true
    setExpanded(false)
    focusTrigger()
  }

  function openPopover() {
    const triggerElement = trigger.current
    const popoverElement = popover.current

    if (triggerElement === null || popoverElement === null) {
      return
    }

    const bounds = triggerElement.getBoundingClientRect()
    const maximumLeft = window.innerWidth - popoverWidth - popoverMargin
    const unclampedLeft = bounds.right - popoverWidth
    const left = Math.max(popoverMargin, Math.min(unclampedLeft, maximumLeft))
    const spaceBelow = window.innerHeight - bounds.bottom - popoverMargin
    const below = spaceBelow >= popoverEstimatedHeight
    const aboveTop = bounds.top - popoverEstimatedHeight - popoverGap
    const top = below
      ? bounds.bottom + popoverGap
      : Math.max(popoverMargin, aboveTop)

    setPosition({ left, top })
    setExpanded(true)
    popoverElement.hidden = false

    if (!popoverElement.matches(":popover-open")) {
      popoverElement.showPopover?.()
    }
    requestAnimationFrame(() => {
      popoverElement
        .querySelector<HTMLButtonElement>("[data-action-popover-row]")
        ?.focus()
    })
  }

  function togglePopover() {
    if (expanded) {
      closePopover()
      return
    }

    openPopover()
  }

  function handleToggle(event: SyntheticEvent<HTMLDivElement>) {
    const open = event.currentTarget.matches(":popover-open")
    setExpanded(open)

    if (!open) {
      event.currentTarget.hidden = true
      focusTrigger()
    }
  }

  function handlePopoverKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return
    }

    event.preventDefault()
    closePopover()
  }

  useEffect(() => {
    const element = popover.current

    if (!expanded || element === null) {
      return
    }

    const openElement = element

    function closeFromOutside() {
      if (openElement.matches(":popover-open")) {
        openElement.hidePopover()
      } else {
        openElement.hidden = true
        setExpanded(false)
      }

      requestAnimationFrame(() => trigger.current?.focus())
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      const clickedPopover = openElement.contains(target)
      const clickedTrigger = trigger.current?.contains(target) === true

      if (!clickedPopover && !clickedTrigger) {
        closeFromOutside()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [expanded])

  function stopPointer(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation()
  }

  const closeThenRunActions = actions.map((action) => ({
    ...action,
    onSelect() {
      closePopover()
      action.onSelect()
    },
  }))

  return (
    <>
      <IconButton
        aria-controls={popoverId}
        aria-expanded={expanded}
        aria-label={label}
        className={triggerClassName}
        disabled={disabled}
        onClick={togglePopover}
        onPointerDown={stopPointer}
        ref={trigger}
        size="compact"
        tone="quiet"
      >
        <MoreIcon />
      </IconButton>
      <div
        aria-label={label}
        className="fixed inset-auto z-50 m-0 w-44 rounded-panel border border-line-strong bg-surface-raised p-1.5 text-ink shadow-floating"
        hidden={!expanded}
        id={popoverId}
        onKeyDown={handlePopoverKeyDown}
        onPointerDown={stopPointer}
        onToggle={handleToggle}
        popover="auto"
        ref={popover}
        role="group"
        style={popoverStyle}
      >
        {closeThenRunActions.map((action, index) => (
          <ActionPopoverRow
            action={action}
            key={action.id}
            separated={index > 0 && action.tone === "danger"}
          />
        ))}
      </div>
    </>
  )
}
