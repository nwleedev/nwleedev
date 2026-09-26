import { createContext, useCallback, useContext, useRef, useState } from "react"

export type ActionToastInput = {
  actionLabel?: string
  expiresAtMs?: number
  kind?: "error" | "status"
  message: string
  onAction?(): void
  onDismiss?(): void
  replacement?: "preserve"
}

export type ActionToastNotice = Omit<
  ActionToastInput,
  "expiresAtMs" | "replacement"
> & {
  expiresAtMs: number
  revision: number
}

export type ActionToastState = {
  notice: ActionToastNotice | null
  dismiss(revision: number): void
  show(input: ActionToastInput): number
}

export const ActionToastContext = createContext<ActionToastState | null>(null)

export function useActionToastState() {
  const [notice, setNotice] = useState<ActionToastNotice | null>(null)
  const currentNotice = useRef<ActionToastNotice | null>(null)
  const nextRevision = useRef(0)

  const dismiss = useCallback((revision: number) => {
    const current = currentNotice.current

    if (current?.revision !== revision) {
      return
    }

    currentNotice.current = null
    setNotice(null)
    current?.onDismiss?.()
  }, [])

  const show = useCallback((input: ActionToastInput) => {
    const current = currentNotice.current
    const { replacement, ...noticeInput } = input

    if (replacement !== "preserve") {
      current?.onDismiss?.()
    }

    nextRevision.current += 1
    const nextNotice: ActionToastNotice = {
      ...noticeInput,
      expiresAtMs: input.expiresAtMs ?? Date.now() + 5_000,
      revision: nextRevision.current,
    }
    currentNotice.current = nextNotice
    setNotice(nextNotice)
    return nextNotice.revision
  }, [])

  return { dismiss, notice, show }
}

export function useActionToast() {
  const context = useContext(ActionToastContext)

  if (context === null) {
    throw new Error("useActionToast must be used within ActionToastProvider")
  }

  return context
}
