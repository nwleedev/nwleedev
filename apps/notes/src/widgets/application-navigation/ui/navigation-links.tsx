"use client"

import Link from "next/link"

import { joinClassNames } from "@/shared/lib/join-class-names"

export const destinations = [
  { href: "/", label: "메모" },
  { href: "/usage/", label: "사용 빈도" },
  { href: "/analysis/", label: "텍스트 분석" },
  { href: "/templates/", label: "템플릿" },
  { href: "/settings/", label: "설정" },
] as const

type NavigationLinksProps = {
  pathname: string
  presentation: "bar" | "drawer"
  onNavigate(href: string, event: { preventDefault(): void }): void
}

const presentationClasses = {
  bar: "min-h-14 px-4 text-sm",
  drawer: "min-h-12 rounded-control px-3 text-base",
} as const

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/u, "")
}

export function NavigationLinks({
  onNavigate,
  pathname,
  presentation,
}: NavigationLinksProps) {
  const currentPath = normalizePathname(pathname)

  return destinations.map((destination, index) => (
    <Link
      aria-current={currentPath === normalizePathname(destination.href) ? "page" : undefined}
      className={joinClassNames(
        "flex items-center font-semibold text-icon transition-colors duration-[var(--notes-motion-fast)] hover:bg-canvas hover:text-text aria-[current=page]:bg-accent/10 aria-[current=page]:text-text",
        presentationClasses[presentation],
      )}
      href={destination.href}
      key={destination.href}
      onNavigate={(event) => onNavigate(destination.href, event)}
      tabIndex={presentation === "bar" ? index + 11 : undefined}
    >
      {destination.label}
    </Link>
  ))
}
