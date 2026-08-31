"use client"

import Link from "next/link"
import { useState } from "react"

const destinations = [
  { href: "/", index: "01", label: "메모" },
  { href: "/usage/", index: "02", label: "사용 빈도" },
  { href: "/analysis/", index: "03", label: "텍스트 분석" },
  { href: "/templates/", index: "04", label: "템플릿" },
  { href: "/settings/", index: "05", label: "설정" },
] as const

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/u, "")
}

type NavigationPlacement = "side" | "top"

type NavigationLinksProps = {
  expanded: boolean
  pathname: string
  placement: NavigationPlacement
  onNavigate(): void
}

function NavigationLinks({
  expanded,
  onNavigate,
  pathname,
  placement,
}: NavigationLinksProps) {
  const navigationClassName =
    placement === "top"
      ? `${expanded ? "grid" : "hidden"} basis-full divide-y divide-rail-ink/15 border-t border-rail-ink/20 pb-3 lg:flex lg:basis-auto lg:self-stretch lg:border-t-0 lg:pb-0`
      : `${expanded ? "block" : "hidden"} divide-y divide-rail-ink/15 border-b border-rail-ink/20 lg:block lg:border-b-0`

  return (
    <nav
      aria-label="주요 화면"
      className={navigationClassName}
      id="application-navigation-links"
    >
      {destinations.map((destination) => {
        const active = pathname === normalizePathname(destination.href)
        const linkClassName =
          placement === "top"
            ? `grid min-h-14 grid-cols-[2.25rem_1fr] items-center gap-2 px-3 transition-colors duration-[var(--notes-motion-fast)] lg:min-h-20 lg:grid-cols-1 lg:content-center lg:gap-1 lg:border-l lg:border-rail-ink/15 lg:px-5 ${active ? "bg-canvas text-ink" : "hover:bg-rail-ink/10"}`
            : `grid min-h-16 grid-cols-[2.25rem_1fr] items-center gap-2 px-5 transition-colors duration-[var(--notes-motion-fast)] lg:min-h-20 lg:px-7 ${active ? "bg-canvas text-ink" : "hover:bg-rail-ink/10"}`

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={linkClassName}
            href={destination.href}
            key={destination.href}
            onClick={onNavigate}
          >
            <span
              aria-hidden="true"
              className="font-mono text-[0.68rem] tracking-[0.12em] opacity-65"
            >
              {destination.index}
            </span>
            <span className="font-bold">{destination.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

type ApplicationNavigationProps = {
  pathname: string
  placement: NavigationPlacement
}

export function ApplicationNavigation({
  pathname,
  placement,
}: ApplicationNavigationProps) {
  const normalizedPathname = normalizePathname(pathname)
  const [expanded, setExpanded] = useState(false)

  function closeDisclosure() {
    setExpanded(false)
  }

  if (placement === "top") {
    return (
      <header className="relative z-30 bg-rail text-rail-ink">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-x-6 px-4 sm:px-7 xl:px-10">
          <Link
            className="py-5 font-display text-2xl font-semibold tracking-[-0.04em]"
            href="/"
          >
            개인 메모
          </Link>
          <button
            aria-controls="application-navigation-links"
            aria-expanded={expanded}
            className="min-h-[var(--notes-control-size)] rounded-control border border-rail-ink/30 px-4 py-2 text-sm font-bold lg:hidden"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            탐색
          </button>
          <NavigationLinks
            expanded={expanded}
            onNavigate={closeDisclosure}
            pathname={normalizedPathname}
            placement={placement}
          />
        </div>
      </header>
    )
  }

  return (
    <aside className="bg-rail text-rail-ink lg:sticky lg:top-0 lg:h-screen lg:min-h-[34rem]">
      <div className="flex min-h-20 items-center justify-between border-b border-rail-ink/20 px-5 lg:min-h-32 lg:items-end lg:px-7 lg:pb-7">
        <Link
          className="font-display text-2xl font-semibold tracking-[-0.04em]"
          href="/"
        >
          개인 메모
        </Link>
      </div>
      <div>
        <button
          aria-controls="application-navigation-links"
          aria-expanded={expanded}
          className="min-h-[var(--notes-control-size)] w-full border-b border-rail-ink/20 px-5 py-3 text-left font-bold lg:hidden"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          탐색
        </button>
        <NavigationLinks
          expanded={expanded}
          onNavigate={closeDisclosure}
          pathname={normalizedPathname}
          placement={placement}
        />
      </div>
    </aside>
  )
}
