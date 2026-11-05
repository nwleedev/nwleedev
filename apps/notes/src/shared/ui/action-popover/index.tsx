"use client"

import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Menu, MenuItem, MenuTrigger, Popover, Pressable, Separator } from "react-aria-components"
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider"

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
    "flex min-h-10 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-semibold outline-none data-focused:bg-canvas data-focus-visible:outline data-focus-visible:outline-[0.2rem] data-focus-visible:outline-offset-[-0.2rem] data-focus-visible:outline-[var(--notes-color-focus)] data-pressed:bg-feedback data-pressed:text-on-accent",
    action.tone === "danger" ? "text-danger data-focused:bg-danger/10 data-pressed:bg-danger/15" : "text-text",
  )

  return (
    <MenuItem
      id={action.id}
      textValue={action.label}
      aria-label={action.label}
      className={rowClassName}
      onAction={action.onSelect}
    >
      <ActionPopoverIcon icon={action.icon} />
      {action.label}
    </MenuItem>
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
    setExpanded,
    getContainer,
    handleKeyDown,
    popoverRef,
    triggerRef,
  } = useActionPopover(disabled)

  function stopPointer(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation()
  }

  const closeThenRunActions = actions.map((action) => ({
    ...action,
    onSelect() {
      close(action.icon !== "properties" && action.icon !== "remove")
      action.onSelect()
    },
  }))

  return (
    <UNSAFE_PortalProvider getContainer={getContainer}>
      <MenuTrigger isOpen={expanded} onOpenChange={setExpanded}>
        <Pressable isDisabled={disabled}>
          <IconButton
            aria-label={label}
            className={joinClassNames("active:translate-y-0!", triggerClassName)}
            disabled={disabled}
            onPointerDown={stopPointer}
            ref={triggerRef}
            size="compact"
            tone="quiet"
          >
            <MoreIcon />
          </IconButton>
        </Pressable>
        <Popover
          className="z-50 w-52 max-w-[calc(100vw-2rem)] overflow-auto rounded-panel border border-border-strong bg-surface-raised p-1.5 text-text shadow-floating"
          containerPadding={12}
          isNonModal
          offset={6}
          placement="bottom end"
          ref={popoverRef}
        >
          <div onKeyDown={handleKeyDown} onPointerDown={stopPointer}>
            <Menu aria-label={label} className="outline-none">
              {closeThenRunActions.map((action, index) => (
                <Fragment key={action.id}>
                  {index > 0 && (
                    action.group !== actions[index - 1].group || action.tone === "danger"
                  ) ? <Separator className="mx-2 my-1 border-0 border-t border-line" /> : null}
                  <ActionPopoverRow action={action} />
                </Fragment>
              ))}
            </Menu>
          </div>
        </Popover>
      </MenuTrigger>
    </UNSAFE_PortalProvider>
  )
}
