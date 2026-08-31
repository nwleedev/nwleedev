import type { ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type TextareaProps = ComponentPropsWithRef<"textarea">

const commonClassName =
  "w-full resize-none rounded-control border border-line bg-surface-raised px-3 py-2 text-[0.98rem] leading-7 text-ink transition-colors duration-[var(--notes-motion-fast)] placeholder:text-soft-ink hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"

export function Textarea({ className = "", ...props }: TextareaProps) {
  const textareaClassName = joinClassNames(commonClassName, className)

  return <textarea className={textareaClassName} {...props} />
}
