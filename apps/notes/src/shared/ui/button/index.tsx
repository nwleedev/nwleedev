import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type ButtonTone = "primary" | "quiet" | "danger" | "solid"

type ButtonProps = ComponentPropsWithRef<"button"> & {
  tone?: ButtonTone
  size?: "control" | "large"
}

const commonClassName =
  "inline-flex items-center justify-center gap-2 rounded-control border px-3 py-1.5 font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-[var(--notes-motion-fast)] active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45"

const sizeClassNames = {
  control: "min-h-[var(--notes-control-size)] text-sm",
  large: "min-h-[var(--notes-control-large-size)] text-base",
}

const toneClassNames: Record<ButtonTone, string> = {
  danger: "border-danger bg-danger text-on-accent hover:bg-danger/90",
  solid: "border-feedback bg-feedback text-on-accent hover:bg-feedback/90",
  primary:
    "border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover",
  quiet:
    "border-border bg-surface-raised text-text hover:border-border-strong hover:bg-canvas",
}

export function Button({
  className = "",
  tone = "primary",
  size = "control",
  type = "button",
  ...props
}: ButtonProps) {
  const buttonClassName = joinClassNames(
    commonClassName,
    sizeClassNames[size],
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
