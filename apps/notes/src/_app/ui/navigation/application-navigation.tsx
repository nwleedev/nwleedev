"use client"

import Link from "next/link"

import { joinClassNames } from "@/shared/lib/join-class-names"

import { useApplicationNavigation } from "./use-application-navigation"

const destinations = [
  {
    activePath: "/",
    href: "/",
    label: "메모",
    tabIndex: 11,
  },
  {
    activePath: "/usage",
    href: "/usage/",
    label: "사용 빈도",
    tabIndex: 12,
  },
  {
    activePath: "/analysis",
    href: "/analysis/",
    label: "텍스트 분석",
    tabIndex: 13,
  },
  {
    activePath: "/templates",
    href: "/templates/",
    label: "템플릿",
    tabIndex: 14,
  },
  {
    activePath: "/settings",
    href: "/settings/",
    label: "설정",
    tabIndex: 15,
  },
] as const

type NavigationLinksProps = {
  expanded: boolean
  id: string
  pathname: string
  onClose(): void
  onNavigate(href: string, event: { preventDefault(): void }): void
}

function NavigationLinks({
  expanded,
  id,
  onClose,
  onNavigate,
  pathname,
}: NavigationLinksProps) {
  const visibilityClassName = expanded ? "grid" : "hidden"
  const navigationClassName = joinClassNames(
    visibilityClassName,
    "basis-full border-t border-border pb-2 lg:flex lg:basis-auto lg:self-stretch lg:border-t-0 lg:pb-0",
  )

  return (
    <nav
      aria-label="주요 화면"
      className={navigationClassName}
      id={id}
    >
      {destinations.map((destination) => {
        const active = pathname === destination.activePath
        const stateClassName = active
          ? "bg-accent/10 text-text shadow-[inset_0_-0.16rem_0_var(--notes-color-accent)]"
          : "text-icon hover:bg-canvas hover:text-text"
        const linkClassName = joinClassNames(
          "flex min-h-11 items-center px-4 text-sm font-semibold transition-colors duration-[var(--notes-motion-fast)] lg:min-h-14",
          stateClassName,
        )

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={linkClassName}
            href={destination.href}
            key={destination.href}
            onClick={onClose}
            onNavigate={(event) => onNavigate(destination.href, event)}
            tabIndex={destination.tabIndex}
          >
            {destination.label}
          </Link>
        )
      })}
    </nav>
  )
}

type ApplicationNavigationProps = {
  noteTask: boolean
  pathname: string
}

export function ApplicationNavigation({
  noteTask,
  pathname,
}: ApplicationNavigationProps) {
  const {
    close,
    expanded,
    handleKeyDown,
    navigate,
    navigationId,
    pathname: normalizedPathname,
    toggle,
    triggerRef,
  } = useApplicationNavigation(pathname)
  const headerClassName = joinClassNames(
    "relative z-30 border-b border-border bg-surface-raised text-text",
    noteTask ? "hidden lg:block" : undefined,
  )

  return (
    <header className={headerClassName} onKeyDown={handleKeyDown}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-5 px-4 sm:px-5 xl:px-6">
        <Link
          className="py-3 text-sm font-semibold tracking-[-0.015em]"
          href="/"
          onNavigate={(event) => navigate("/", event)}
          tabIndex={2}
        >
          개인 메모
        </Link>
        <button
          aria-controls={navigationId}
          aria-expanded={expanded}
          className="min-h-[var(--notes-control-size)] rounded-control border border-border px-3 py-1.5 text-sm font-semibold lg:hidden"
          onClick={toggle}
          ref={triggerRef}
          tabIndex={3}
          type="button"
        >
          탐색
        </button>
        <NavigationLinks
          expanded={expanded}
          id={navigationId}
          onClose={close}
          onNavigate={navigate}
          pathname={normalizedPathname}
        />
      </div>
    </header>
  )
}
