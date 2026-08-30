import type { ReactNode } from "react"

type PageHeadingProps = {
  action?: ReactNode
  title: string
}

export function PageHeading({ action, title }: PageHeadingProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-ink pb-5">
      <h1 className="font-display text-[clamp(2.6rem,7vw,5.8rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-ink">
        {title}
      </h1>
      {action ? <div className="pb-1">{action}</div> : null}
    </header>
  )
}
