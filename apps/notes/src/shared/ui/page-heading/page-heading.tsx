import type { PropsWithChildren } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type PageHeadingProps = PropsWithChildren<{
  density?: "compact" | "display"
  title: string
}>

const titleClassNames = {
  compact: "text-[clamp(1.5rem,2.5vw,1.9rem)] leading-tight tracking-[-0.025em]",
  display: "text-[clamp(1.75rem,3.5vw,2.4rem)] leading-tight tracking-[-0.03em]",
} as const

export function PageHeading({
  children,
  density = "display",
  title,
}: PageHeadingProps) {
  const titleClassName = joinClassNames(
    "font-semibold text-ink",
    titleClassNames[density],
  )

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-3">
      <h1 className={titleClassName}>{title}</h1>
      {children}
    </header>
  )
}
