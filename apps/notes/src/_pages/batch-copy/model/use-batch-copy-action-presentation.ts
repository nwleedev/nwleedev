"use client"

import { useLayoutEffect, useRef, useState } from "react"

type ActionPresentation = "popover" | "sheet"

const sheetBreakpointRem = 48

export function useBatchCopyActionPresentation() {
  const container = useRef<HTMLDivElement>(null)
  const [presentation, setPresentation] = useState<ActionPresentation | null>(null)

  useLayoutEffect(() => {
    const element = container.current

    if (element === null) {
      return
    }

    function measure() {
      if (element === null) {
        return
      }

      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      const sheetBreakpoint = sheetBreakpointRem * rootFontSize
      const width = element.getBoundingClientRect().width
      setPresentation(width < sheetBreakpoint ? "sheet" : "popover")
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { container, presentation }
}
