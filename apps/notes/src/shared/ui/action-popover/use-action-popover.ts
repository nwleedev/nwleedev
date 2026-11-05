"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useInteractOutside } from "react-aria/useInteractOutside"

export function useActionPopover(disabled: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const restoreAfterAction = useRef(false)

  function close(restoreFocus = false) {
    restoreAfterAction.current = restoreFocus
    setExpanded(false)
  }

  useEffect(() => {
    if (expanded || disabled || !restoreAfterAction.current) return
    restoreAfterAction.current = false
    const trigger = triggerRef.current
    if (trigger === null) return
    const activeElement = trigger.ownerDocument.activeElement
    if (activeElement !== trigger.ownerDocument.body && activeElement !== trigger) return
    trigger.focus({ preventScroll: true })
  }, [expanded, disabled])

  useInteractOutside({
    ref: popoverRef,
    isDisabled: !expanded,
    onInteractOutside(event) {
      if (event.target instanceof Node && triggerRef.current?.contains(event.target)) return
      close()
    },
  })

  function getContainer() {
    return triggerRef.current?.closest("dialog") ?? document.body
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Tab") {
      triggerRef.current?.focus({ preventScroll: true })
      close()
      event.stopPropagation()
    }
  }

  return { close, expanded, setExpanded, getContainer, handleKeyDown, popoverRef, triggerRef }
}
