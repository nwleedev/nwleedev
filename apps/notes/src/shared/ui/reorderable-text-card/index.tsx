import type { ComponentPropsWithRef, ReactNode } from "react"

import { GripIcon } from "@/shared/ui/icons"

type ReorderableTextCardProps = {
  children: ReactNode
  dragging: boolean
  dropPlacement: "after" | "before" | null
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
  pressed = false,
}: ReorderableTextCardProps) {
  return (
    <article
      aria-label={label}
      className="relative grid min-h-[var(--notes-mobile-card-min-height)] grid-cols-[var(--notes-touch-target)_minmax(0,1fr)_auto] items-center gap-1 rounded-note border border-border bg-surface-raised p-1 text-base leading-7 text-ink transition-[border-color,box-shadow,translate] data-[dragging=true]:z-10 data-[dragging=true]:-translate-y-1 data-[dragging=true]:border-action data-[dragging=true]:shadow-floating data-[pressed=true]:outline data-[pressed=true]:outline-[length:var(--notes-mobile-pressed-width)] data-[pressed=true]:outline-danger data-[pressed=true]:-outline-offset-[length:var(--notes-mobile-pressed-width)] data-[drop=before]:before:absolute data-[drop=before]:before:-top-2 data-[drop=before]:before:left-1 data-[drop=before]:before:right-1 data-[drop=before]:before:h-1 data-[drop=before]:before:rounded-full data-[drop=before]:before:bg-action data-[drop=after]:after:absolute data-[drop=after]:after:-bottom-2 data-[drop=after]:after:left-1 data-[drop=after]:after:right-1 data-[drop=after]:after:h-1 data-[drop=after]:after:rounded-full data-[drop=after]:after:bg-action"
      data-dragging={dragging}
      data-drop={dropPlacement}
      data-pressed={pressed}
    >
      {children}
    </article>
  )
}

export function ReorderHandle(props: ReorderHandleProps) {
  return (
    <button
      className="notes-reorder-handle flex min-h-[var(--notes-touch-target)] min-w-[var(--notes-touch-target)] touch-none cursor-grab items-center justify-center self-center rounded-control border-0 bg-transparent text-icon active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
      type="button"
      {...props}
    >
      <GripIcon className="size-5" />
    </button>
  )
}
