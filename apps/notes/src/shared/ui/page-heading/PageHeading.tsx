import type { ReactNode } from "react"

type PageHeadingProps = {
  action?: ReactNode
  density?: "compact" | "display"
  title: string
}

const titleClassNames = {
  compact:
    "text-[clamp(2.35rem,4.4vw,4rem)] leading-[0.98] tracking-[-0.045em]",
  display: "text-[clamp(2.6rem,7vw,5.8rem)] leading-[0.92] tracking-[-0.055em]",
} as const

export function PageHeading({
  action,
  density = "display",
  title,
}: PageHeadingProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-ink pb-5">
      <h1
        className={`font-display font-semibold text-ink ${titleClassNames[density]}`}
      >
        {title}
      </h1>
      {action ? <div className="pb-1">{action}</div> : null}
    </header>
  )
}
