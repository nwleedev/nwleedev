"use client"

import Link from "next/link"

import { useBarNavigation } from "../model/use-bar-navigation"
import { MobileNavigation } from "./mobile-navigation"
import { NavigationLinks } from "./navigation-links"

type NavigationBarProps = {
  pathname: string
}

type BarMode = "desktop-only" | "document"

const headerClasses: Record<BarMode, string> = {
  "desktop-only": "hidden shrink-0 border-b border-border bg-surface-raised text-text md:block",
  document: "shrink-0 border-b border-border bg-surface-raised text-text",
}

const linksClasses: Record<BarMode, string> = {
  "desktop-only": "flex self-stretch",
  document: "hidden self-stretch md:flex",
}

function NavigationBar({
  mode,
  pathname,
}: NavigationBarProps & { mode: BarMode }) {
  const navigate = useBarNavigation()
  const documentMode = mode === "document"

  return (
    <header className={headerClasses[mode]}>
      <div className="flex min-h-14 items-center justify-between gap-5 px-4 sm:px-5 xl:px-6">
        <Link
          className="py-3 text-sm font-semibold tracking-[-0.015em]"
          href="/"
          onNavigate={(event) => navigate("/", event)}
          tabIndex={2}
        >
          개인 메모
        </Link>
        {documentMode ? (
          <div className="md:hidden">
            <MobileNavigation pathname={pathname} />
          </div>
        ) : null}
        <nav aria-label="주요 화면" className={linksClasses[mode]}>
          <NavigationLinks onNavigate={navigate} pathname={pathname} presentation="bar" />
        </nav>
      </div>
    </header>
  )
}

export function DesktopNavigation({ pathname }: NavigationBarProps) {
  return <NavigationBar mode="desktop-only" pathname={pathname} />
}

export function DocumentNavigation({ pathname }: NavigationBarProps) {
  return <NavigationBar mode="document" pathname={pathname} />
}
