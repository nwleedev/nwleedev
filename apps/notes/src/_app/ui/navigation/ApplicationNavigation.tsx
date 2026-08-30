"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

export function ApplicationNavigation() {
  const pathname = normalizePathname(usePathname())
  const [expanded, setExpanded] = useState(false)

  function closeDisclosure() {
    setExpanded(false)
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
        <nav
          aria-label="주요 화면"
          className={`${expanded ? "block" : "hidden"} divide-y divide-rail-ink/15 border-b border-rail-ink/20 lg:block lg:border-b-0`}
          id="application-navigation-links"
        >
          {destinations.map((destination) => {
            const active = pathname === normalizePathname(destination.href)

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`grid min-h-16 grid-cols-[2.25rem_1fr] items-center gap-2 px-5 transition-colors duration-[var(--notes-motion-fast)] lg:min-h-20 lg:px-7 ${active ? "bg-canvas text-ink" : "hover:bg-rail-ink/10"}`}
                href={destination.href}
                key={destination.href}
                onClick={closeDisclosure}
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
      </div>
    </aside>
  )
}
