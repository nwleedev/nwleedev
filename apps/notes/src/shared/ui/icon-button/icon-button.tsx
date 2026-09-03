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
  "inline-flex shrink-0 items-center justify-center rounded-control border-0 transition-[background-color,color,opacity,transform] duration-[var(--notes-motion-fast)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"

const sizeClassNames: Record<IconButtonSize, string> = {
  compact: "h-8 w-8",
  control: "h-[var(--notes-control-size)] w-[var(--notes-control-size)]",
}

const toneClassNames: Record<IconButtonTone, string> = {
  danger: "bg-transparent text-danger hover:bg-danger/10",
  quiet: "bg-transparent text-ink hover:bg-ink/8",
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
