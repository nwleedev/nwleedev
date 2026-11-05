"use client"

import { useState, type ComponentPropsWithRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"

import { DropIndicator } from "@/shared/ui/drop-indicator"
import { GripIcon } from "@/shared/ui/icons"

type ReorderableTextCardProps = {
  children: ReactNode
  dragging: boolean
  dropPlacement: "after" | "before" | null
  list: "notes" | "confirmation"
  label: string
  pressed?: boolean
}

type ReorderHandleProps = Pick<
  ComponentPropsWithRef<"button">,
  | "disabled"
  | "onLostPointerCapture"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "ref"
> & {
  "aria-label": string
}

export function ReorderableTextCard({
  children,
  dragging,
  dropPlacement,
  label,
  list,
  pressed = false,
}: ReorderableTextCardProps) {
  return (
    <article
      aria-label={label}
      className="relative flex min-h-[var(--notes-mobile-card-min-height)] flex-col rounded-note border border-border bg-surface-raised text-base leading-7 text-ink transition-[border-color,opacity] data-[dragging=true]:opacity-35 data-[pressed=true]:outline data-[pressed=true]:outline-[length:var(--notes-mobile-pressed-width)] data-[pressed=true]:outline-danger data-[pressed=true]:-outline-offset-[length:var(--notes-mobile-pressed-width)]"
      data-card-list={list}
      data-dragging={dragging}
      data-drop={dropPlacement}
      data-pressed={pressed}
    >
      {children}
      <DropIndicator placement={dropPlacement} end="right" />
    </article>
  )
}

export function ReorderableTextCardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[var(--notes-card-header-height)] shrink-0 items-end justify-between rounded-t-[inherit] px-1">
      {children}
    </div>
  )
}

export function ReorderHandle({ onPointerDown, ...props }: ReorderHandleProps) {
  const [pointerFocused, setPointerFocused] = useState(false)

  function beginPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    setPointerFocused(true)
    onPointerDown?.(event)
  }

  function clearPointerFocus() {
    setPointerFocused(false)
  }

  return (
    <button
      className="notes-reorder-handle flex min-h-[var(--notes-touch-target)] min-w-[var(--notes-touch-target)] touch-none cursor-grab items-center justify-center rounded-control border-0 bg-transparent text-icon active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
      data-pointer-focus={pointerFocused}
      onBlur={clearPointerFocus}
      onKeyDown={clearPointerFocus}
      onPointerDown={beginPointer}
      type="button"
      {...props}
    >
      <GripIcon className="size-5" />
    </button>
  )
}
