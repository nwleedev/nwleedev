"use client"

import type { ReactNode } from "react"

import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"

import { useActionSheet } from "./use-action-sheet"

type ActionSheetProps = {
  children: ReactNode
  label: string
  onClose(): void
  open: boolean
}

export function ActionSheet({ children, label, onClose, open }: ActionSheetProps) {
  const { close, closeOnBackdrop, dialogRef } = useActionSheet(open)

  return (
    <dialog
      aria-label={label}
      className="notes-action-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[100dvh] w-full max-w-none overflow-auto rounded-t-panel border-0 bg-surface-raised p-0 pb-[env(safe-area-inset-bottom)] text-text shadow-floating"
      onClick={closeOnBackdrop}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="px-4 pb-4 pt-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-sm font-semibold">{label}</h2>
          <IconButton aria-label="동작 선택창 닫기" onClick={close} size="control">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  )
}
