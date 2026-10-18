import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type IconButtonSize = "compact" | "control" | "floating"
type IconButtonTone = "accent" | "danger" | "quiet"

type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-label"> & {
  "aria-label": string
  size?: IconButtonSize
  tone?: IconButtonTone
}

const commonClassName =
  "inline-flex shrink-0 items-center justify-center border-0 transition-[background-color,color,opacity,transform] duration-[var(--notes-motion-fast)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"

const sizeClassNames: Record<IconButtonSize, string> = {
  compact: "h-8 w-8 rounded-control",
  control: "h-[var(--notes-control-size)] w-[var(--notes-control-size)] rounded-control",
  floating: "h-[var(--notes-mobile-action-size)] w-[var(--notes-mobile-action-size)] rounded-full",
}

const toneClassNames: Record<IconButtonTone, string> = {
  accent: "bg-accent text-on-accent-icon hover:bg-accent-hover",
  danger: "bg-transparent text-danger hover:bg-danger/10",
  quiet: "bg-transparent text-icon hover:bg-text/8 hover:text-text",
}

export function IconButton({
  className = "",
  size = "control",
  tone = "quiet",
  type = "button",
  ...props
}: IconButtonProps) {
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
