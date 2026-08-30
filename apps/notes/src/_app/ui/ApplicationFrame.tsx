import type { PropsWithChildren } from "react"

import { ApplicationNavigation } from "./navigation"

export function ApplicationFrame({ children }: PropsWithChildren) {
  return (
    <>
      <a
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-control bg-ink px-4 py-3 font-bold text-canvas focus:translate-y-0"
        href="#main-content"
      >
        본문으로 이동
      </a>
      <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <ApplicationNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  )
}
