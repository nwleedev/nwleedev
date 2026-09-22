"use client"

import { useRouter } from "next/navigation"
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"

import { useNavigationGuard } from "@/features/navigation-guard"

type NavigationEvent = {
  preventDefault(): void
}

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/u, "")
}

export function useApplicationNavigation(pathname: string) {
  const router = useRouter()
  const { requestNavigation } = useNavigationGuard()
  const navigationId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)

  function close() {
    setExpanded(false)
  }

  function toggle() {
    setExpanded((current) => !current)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || !expanded) {
      return
    }

    event.preventDefault()
    close()
    triggerRef.current?.focus()
  }

  function navigate(href: string, event: NavigationEvent) {
    if (requestNavigation(() => router.push(href))) {
      event.preventDefault()
    }
  }

  return {
    close,
    expanded,
    handleKeyDown,
    navigate,
    navigationId,
    pathname: normalizePathname(pathname),
    toggle,
    triggerRef,
  }
}
