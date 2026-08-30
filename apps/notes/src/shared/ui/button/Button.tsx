import type { ComponentPropsWithRef } from "react"

type ButtonTone = "primary" | "quiet"

type ButtonProps = ComponentPropsWithRef<"button"> & {
  tone?: ButtonTone
}

const commonClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-bold tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-[var(--notes-motion-fast)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"

const toneClassNames: Record<ButtonTone, string> = {
  primary:
    "border-action bg-action text-action-ink hover:border-action-hover hover:bg-action-hover",
  quiet:
    "border-line-strong bg-transparent text-ink hover:bg-paper hover:border-ink",
}

export function Button({
  className = "",
  tone = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${commonClassName} ${toneClassNames[tone]} ${className}`}
      type={type}
      {...props}
    />
  )
}
