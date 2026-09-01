"use client"

import { useId, type ComponentPropsWithRef } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type CheckboxProps = Omit<
  ComponentPropsWithRef<"input">,
  "className" | "type"
> & {
  description?: string
  label: string
}

export function Checkbox({
  description,
  disabled,
  id,
  label,
  ...props
}: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  const labelClassName = joinClassNames(
    "grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
  )
  const descriptionClassName = joinClassNames(
    "ml-9 mt-1 text-sm leading-6 text-soft-ink",
    disabled ? "opacity-45" : undefined,
  )

  return (
    <div>
      <label className={labelClassName} htmlFor={inputId}>
        <input
          aria-describedby={descriptionId}
          className="peer sr-only"
          disabled={disabled}
          id={inputId}
          type="checkbox"
          {...props}
        />
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-5 place-items-center rounded-[0.2rem] border-2 border-line-strong bg-surface text-sm font-black text-transparent transition-colors duration-[var(--notes-motion-fast)] before:content-['✓'] peer-checked:border-action peer-checked:bg-action peer-checked:text-action-ink peer-focus-visible:outline peer-focus-visible:outline-[0.2rem] peer-focus-visible:outline-offset-[0.2rem] peer-focus-visible:outline-[var(--notes-focus-ring)] peer-disabled:cursor-not-allowed peer-disabled:opacity-45"
        />
        <span className="font-bold leading-6 peer-disabled:opacity-45">
          {label}
        </span>
      </label>
      {description ? (
        <p className={descriptionClassName} id={descriptionId}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
