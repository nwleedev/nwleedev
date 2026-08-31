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
    "border-action bg-action text-action-ink hover:border-action-hover hover:bg-action-hover",
  quiet:
    "border-line bg-surface-raised text-ink hover:border-line-strong hover:bg-canvas",
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
