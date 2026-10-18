"use client"

import { useEffect, type ReactNode } from "react"

import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"

import { useActionSheet } from "./use-action-sheet"

type ActionSheetProps = {
  children: ReactNode
  label: string
  onClose(): void
  open: boolean
  fixedHeight?: boolean
  dismissible?: boolean
}

export function ActionSheet({ children, label, onClose, open, fixedHeight = false, dismissible = true }: ActionSheetProps) {
  const { close, closeOnBackdrop, dialogRef } = useActionSheet(open, dismissible)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!fixedHeight || !open || dialog === null) return
    if (dialog.open && !dialog.contains(document.activeElement)) {
      dialog.querySelector("h2")?.focus()
    }
  })

  return (
    <dialog
      aria-label={label}
      className="notes-action-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[100dvh] w-full max-w-none overflow-auto rounded-t-panel border-0 bg-surface-raised p-0 pb-[env(safe-area-inset-bottom)] text-text shadow-floating"
      data-fixed-height={fixedHeight}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault()
      }}
      onClick={closeOnBackdrop}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="notes-action-sheet-frame px-4 pb-4 pt-3">
        <div className="notes-action-sheet-heading flex min-h-11 items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-sm font-semibold" tabIndex={-1}>{label}</h2>
          <IconButton className="notes-action-sheet-close" aria-label="동작 선택창 닫기" disabled={!dismissible} onClick={close} size="control">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  )
}
