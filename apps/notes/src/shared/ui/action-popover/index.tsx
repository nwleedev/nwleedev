"use client"

import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"
import { IconButton } from "@/shared/ui/icon-button"
import {
  DuplicateIcon,
  MoveFirstIcon,
  MoveLastIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BringToFrontIcon,
  GripIcon,
  MoreIcon,
  PropertiesIcon,
  RemoveIcon,
  SendToBackIcon,
} from "@/shared/ui/icons"

import { useActionPopover } from "./use-action-popover"

export type ActionPopoverAction = {
  id: string
  icon: "back" | "down" | "duplicate" | "first" | "last" | "front" | "move" | "properties" | "remove" | "up"
  group?: string
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
}

function ActionPopoverIcon({ icon }: Pick<ActionPopoverAction, "icon">) {
  if (icon === "duplicate") {
    return <DuplicateIcon />
  }

  if (icon === "remove") {
    return <RemoveIcon />
  }

  if (icon === "properties") {
    return <PropertiesIcon />
  }

  if (icon === "front") {
    return <BringToFrontIcon />
  }

  if (icon === "back") {
    return <SendToBackIcon />
  }

  if (icon === "first") return <MoveFirstIcon />
  if (icon === "last") return <MoveLastIcon />

  if (icon === "up") {
    return <ArrowUpIcon />
  }

  if (icon === "down") {
    return <ArrowDownIcon />
  }

  return <GripIcon />
}

function ActionPopoverRow({
  action,
}: ActionPopoverRowProps) {
  const rowClassName = joinClassNames(
    "flex min-h-10 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-semibold hover:bg-canvas focus-visible:outline focus-visible:outline-[0.2rem] focus-visible:outline-offset-[-0.2rem] focus-visible:outline-[var(--notes-color-focus)] active:bg-feedback active:text-on-accent",
    action.tone === "danger" ? "text-danger hover:bg-danger/10 active:bg-danger/15" : "text-text",
  )

  return (
    <button
      aria-label={action.label}
      className={rowClassName}
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
  const {
    close,
    expanded,
    handleToggle,
    popoverId,
    popoverRef,
    toggle,
    triggerRef,
  } = useActionPopover()

  function stopPointer(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation()
  }

  const closeThenRunActions = actions.map((action) => ({
    ...action,
    onSelect() {
      close()
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
        onClick={toggle}
        onPointerDown={stopPointer}
        popoverTarget={popoverId}
        popoverTargetAction="toggle"
        ref={triggerRef}
        size="compact"
        tone="quiet"
      >
        <MoreIcon />
      </IconButton>
      <div
        aria-label={label}
        className="fixed inset-auto z-50 m-0 w-52 max-w-[calc(100vw-2rem)] rounded-panel border border-border-strong bg-surface-raised p-1.5 text-text shadow-floating"
        id={popoverId}
        onPointerDown={stopPointer}
        onToggle={handleToggle}
        popover="auto"
        ref={popoverRef}
        role="group"
      >
        {closeThenRunActions.map((action, index) => (
          <Fragment key={action.id}>
            {index > 0 && (
              action.group !== actions[index - 1].group || action.tone === "danger"
            ) ? <hr className="mx-2 my-1 border-0 border-t border-line" /> : null}
            <ActionPopoverRow action={action} />
          </Fragment>
        ))}
      </div>
    </>
  )
}
