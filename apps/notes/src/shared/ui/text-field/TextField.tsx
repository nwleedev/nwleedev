import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type TextFieldProps = ComponentPropsWithRef<"input">

const commonClassName =
  "min-h-[var(--notes-control-size)] w-full rounded-control border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition-colors duration-[var(--notes-motion-fast)] placeholder:text-soft-ink hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"

export function TextField({ className = "", ...props }: TextFieldProps) {
  const inputClassName = joinClassNames(commonClassName, className)

  return <input className={inputClassName} {...props} />
}
