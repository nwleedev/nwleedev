"use client"

import type { PropsWithChildren } from "react"

import { ActionToast } from "./action-toast"
import {
  ActionToastContext,
  useActionToast,
  useActionToastState,
} from "./action-toast-state"

function ActionToastViewport() {
  const { dismiss, notice } = useActionToast()

  if (notice === null) {
    return null
  }

  return (
    <div className="notes-action-toast-viewport">
      <ActionToast
        actionLabel={notice.actionLabel}
        expiresAtMs={notice.expiresAtMs}
        kind={notice.kind}
        message={notice.message}
        onAction={notice.onAction}
        onDismiss={() => dismiss(notice.revision)}
        revision={notice.revision}
      />
    </div>
  )
}

export function ActionToastProvider({ children }: PropsWithChildren) {
  const state = useActionToastState()

  return (
    <ActionToastContext value={state}>
      {children}
      <ActionToastViewport />
    </ActionToastContext>
  )
}
