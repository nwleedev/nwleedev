"use client"

import type { FocusEvent as ReactFocusEvent } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"

import { useActionToastTimer } from "./use-action-toast-timer"

type ActionToastProps = {
  actionLabel?: string
  className?: string
  durationMs?: number
  expiresAtMs?: number
  kind?: "error" | "status"
  message: string
  onAction?(): void
  onDismiss(): void
  revision: number
}

const TOAST_DURATION_MS = 5_000

export function ActionToast({
  actionLabel,
  className = "",
  durationMs = TOAST_DURATION_MS,
  expiresAtMs,
  kind = "status",
  message,
  onAction,
  onDismiss,
  revision,
}: ActionToastProps) {
  const actionable = actionLabel !== undefined && onAction !== undefined
  const { pause, resume } = useActionToastTimer({
    durationMs,
    expiresAtMs,
    onDismiss,
    pausable: actionable,
    revision,
  })
  const toastClassName = joinClassNames(
    "notes-action-toast flex items-center gap-3 rounded-panel border bg-surface-raised px-3 py-2.5 text-sm leading-5 text-text shadow-floating",
    kind === "error" ? "border-danger" : "border-border-strong",
    className,
  )

  function resumeAfterFocusLeaves(event: ReactFocusEvent<HTMLDivElement>) {
    const nextFocused = event.relatedTarget

    if (nextFocused instanceof Node && event.currentTarget.contains(nextFocused)) {
      return
    }

    resume()
  }

  function runAction() {
    onAction?.()
  }

  return (
    <div
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={toastClassName}
      onBlur={resumeAfterFocusLeaves}
      onFocus={pause}
      onPointerEnter={pause}
      onPointerLeave={resume}
      role={kind === "error" ? "alert" : "status"}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {actionable ? (
        <Button onClick={runAction} tone="quiet">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
