"use client"

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react"

export function useActionSheet(open: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (dialog === null) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function close() {
    dialogRef.current?.close()
  }

  function closeOnBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      close()
    }
  }

  return { close, closeOnBackdrop, dialogRef }
}
