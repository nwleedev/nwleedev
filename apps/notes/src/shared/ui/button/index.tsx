import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type ButtonTone = "primary" | "quiet"

type ButtonProps = ComponentPropsWithRef<"button"> & {
  tone?: ButtonTone
}

const commonClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center gap-2 rounded-control border px-3 py-1.5 text-sm font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-[var(--notes-motion-fast)] active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45"

const toneClassNames: Record<ButtonTone, string> = {
  primary:
    "border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover",
  quiet:
    "border-border bg-surface-raised text-text hover:border-border-strong hover:bg-canvas",
}

export function Button({
  className = "",
  tone = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const buttonClassName = joinClassNames(
    commonClassName,
    toneClassNames[tone],
    className,
  )

  return (
    <button
      className={buttonClassName}
      type={type}
      {...props}
    />
  )
}
