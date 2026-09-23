"use client"

import { useRouter } from "next/navigation"
import { useRef, type MouseEvent as ReactMouseEvent } from "react"

import { useNavigationGuard } from "@/features/navigation-guard"

export function useNavigationDrawer() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const { requestNavigation } = useNavigationGuard()

  function open() {
    dialog.current?.showModal()
  }

  function close() {
    dialog.current?.close()
  }

  function restoreFocus() {
    trigger.current?.focus()
  }

  function closeOnBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      close()
    }
  }

  function navigate(href: string, event: { preventDefault(): void }) {
    close()

    if (requestNavigation(() => router.push(href))) {
      event.preventDefault()
    }
  }

  return { close, closeOnBackdrop, dialog, navigate, open, restoreFocus, trigger }
}
