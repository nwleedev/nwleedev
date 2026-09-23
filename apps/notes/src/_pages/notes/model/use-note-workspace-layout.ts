"use client"

import { useLayoutEffect, useRef, useState } from "react"

type WorkspaceLayout = "desktop" | "mobile" | null

export function useNoteWorkspaceLayout() {
  const container = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<WorkspaceLayout>(null)

  useLayoutEffect(() => {
    const element = container.current

    if (element === null) {
      return
    }

    const observedElement: HTMLDivElement = element

    function measureLayout() {
      const boardMinWidthRem = Number.parseFloat(
        getComputedStyle(observedElement).getPropertyValue(
          "--notes-board-min-width",
        ),
      )
      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      const minimumWidth = boardMinWidthRem * rootFontSize
      setLayout(observedElement.clientWidth >= minimumWidth ? "desktop" : "mobile")
    }

    measureLayout()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureLayout)
      return () => window.removeEventListener("resize", measureLayout)
    }

    const observer = new ResizeObserver(measureLayout)
    observer.observe(observedElement)
    return () => observer.disconnect()
  }, [])

  return { container, layout }
}
