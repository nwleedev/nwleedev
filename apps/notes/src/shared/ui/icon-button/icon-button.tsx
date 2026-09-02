import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type IconButtonSize = "compact" | "control"
type IconButtonTone = "danger" | "quiet"

type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-label"> & {
  "aria-label": string
  size?: IconButtonSize
  tone?: IconButtonTone
}

const commonClassName =
  "inline-flex shrink-0 items-center justify-center rounded-control border transition-[background-color,border-color,color,opacity,transform] duration-[var(--notes-motion-fast)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"

const sizeClassNames: Record<IconButtonSize, string> = {
  compact: "h-8 w-8",
  control: "h-[var(--notes-control-size)] w-[var(--notes-control-size)]",
}

const toneClassNames: Record<IconButtonTone, string> = {
  danger:
    "border-line bg-surface-raised text-danger hover:border-danger hover:bg-canvas",
  quiet:
    "border-line bg-surface-raised text-ink hover:border-line-strong hover:bg-canvas",
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
