"use client"

import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"

import { ApplicationNavigation } from "./navigation"

export function ApplicationFrame({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const normalizedPathname =
    pathname === "/" ? pathname : pathname.replace(/\/$/u, "")
  const usesTopNavigation =
    normalizedPathname === "/" || normalizedPathname === "/accumulator"
  const navigationPlacement = usesTopNavigation ? "top" : "side"
  const frameClassName =
    navigationPlacement === "side"
      ? "min-h-screen lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)]"
      : "grid h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden"

  return (
    <>
      <a
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-control bg-ink px-4 py-3 font-bold text-canvas focus:translate-y-0"
        href="#main-content"
      >
        본문으로 이동
      </a>
      <div className={frameClassName}>
        <ApplicationNavigation
          key={navigationPlacement}
          pathname={pathname}
          placement={navigationPlacement}
        />
        <div className="min-h-0 min-w-0">{children}</div>
      </div>
    </>
  )
}
