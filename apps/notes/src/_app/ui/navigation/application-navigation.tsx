"use client"

import Link from "next/link"
import { useState } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

const destinations = [
  {
    activePath: "/",
    href: "/",
    index: "01",
    label: "메모",
    tabIndex: 11,
  },
  {
    activePath: "/usage",
    href: "/usage/",
    index: "02",
    label: "사용 빈도",
    tabIndex: 12,
  },
  {
    activePath: "/analysis",
    href: "/analysis/",
    index: "03",
    label: "텍스트 분석",
    tabIndex: 13,
  },
  {
    activePath: "/templates",
    href: "/templates/",
    index: "04",
    label: "템플릿",
    tabIndex: 14,
  },
  {
    activePath: "/settings",
    href: "/settings/",
    index: "05",
    label: "설정",
    tabIndex: 15,
  },
] as const

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/u, "")
}

type NavigationPlacement = "side" | "top"

const navigationBaseClassNames: Record<NavigationPlacement, string> = {
  side:
    "divide-y divide-rail-ink/15 border-b border-rail-ink/20 lg:block lg:border-b-0",
  top:
    "basis-full divide-y divide-rail-ink/10 border-t border-rail-ink/15 pb-2 lg:flex lg:basis-auto lg:self-stretch lg:border-t-0 lg:pb-0",
}

const navigationVisibleClassNames: Record<NavigationPlacement, string> = {
  side: "block",
  top: "grid",
}

const linkBaseClassNames: Record<NavigationPlacement, string> = {
  side:
    "grid min-h-12 grid-cols-[1.75rem_1fr] items-center gap-2 px-4 text-sm transition-colors duration-[var(--notes-motion-fast)] lg:min-h-12",
  top:
    "grid min-h-11 grid-cols-[1.75rem_1fr] items-center gap-2 px-3 text-sm transition-colors duration-[var(--notes-motion-fast)] lg:min-h-14 lg:grid-cols-[1.5rem_auto] lg:border-l lg:border-rail-ink/10 lg:px-4",
}

const activeLinkClassNames: Record<NavigationPlacement, string> = {
  side:
    "bg-rail-ink/12 text-rail-ink shadow-[inset_0.16rem_0_0_var(--notes-focus-ring)]",
  top:
    "bg-rail-ink/12 text-rail-ink shadow-[inset_0_-0.16rem_0_var(--notes-focus-ring)]",
}

const inactiveLinkClassNames: Record<NavigationPlacement, string> = {
  side: "hover:bg-rail-ink/8",
  top: "hover:bg-rail-ink/8",
}

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
  const visibilityClassName = expanded
    ? navigationVisibleClassNames[placement]
    : "hidden"
  const navigationClassName = joinClassNames(
    visibilityClassName,
    navigationBaseClassNames[placement],
  )

  return (
    <nav
      aria-label="주요 화면"
      className={navigationClassName}
      id="application-navigation-links"
    >
      {destinations.map((destination) => {
        const active = pathname === destination.activePath
        const stateClassName = active
          ? activeLinkClassNames[placement]
          : inactiveLinkClassNames[placement]
        const linkClassName = joinClassNames(
          linkBaseClassNames[placement],
          stateClassName,
        )

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={linkClassName}
            href={destination.href}
            key={destination.href}
            onClick={onNavigate}
            tabIndex={destination.tabIndex}
          >
            <span
              aria-hidden="true"
              className="text-[0.62rem] font-medium tabular-nums tracking-[0.08em] opacity-55"
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
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-5 border-b border-rail-ink/10 px-4 sm:px-5 xl:px-6">
          <Link
            className="py-3 font-display text-sm font-semibold tracking-[-0.015em]"
            href="/"
            tabIndex={2}
          >
            개인 메모
          </Link>
          <button
            aria-controls="application-navigation-links"
            aria-expanded={expanded}
            className="min-h-[var(--notes-control-size)] rounded-control border border-rail-ink/25 px-3 py-1.5 text-sm font-semibold lg:hidden"
            onClick={() => setExpanded((current) => !current)}
            tabIndex={3}
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
      <div className="flex min-h-14 items-center justify-between border-b border-rail-ink/15 px-4 lg:min-h-16">
        <Link
          className="font-display text-sm font-semibold tracking-[-0.015em]"
          href="/"
          tabIndex={2}
        >
          개인 메모
        </Link>
      </div>
      <div>
        <button
          aria-controls="application-navigation-links"
          aria-expanded={expanded}
          className="min-h-[var(--notes-control-size)] w-full border-b border-rail-ink/15 px-4 py-2 text-left text-sm font-semibold lg:hidden"
          onClick={() => setExpanded((current) => !current)}
          tabIndex={3}
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
