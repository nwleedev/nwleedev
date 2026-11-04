"use client"

import type { ComponentProps } from "react"

import { Button } from "@/shared/ui/button"

import type { CopyBatchTextResult } from "../model/copy-batch-text"
import { useCopyBatchText } from "../model/use-copy-batch-text"

type CopyBatchTextActionProps = Pick<ComponentProps<typeof Button>, "className" | "size"> & {
  disabled: boolean
  label?: string
  onCopy(): Promise<CopyBatchTextResult>
  onResult(result: CopyBatchTextResult): void
}

export function CopyBatchTextAction({
  className,
  size,
  disabled,
  label = "복사",
  onCopy,
  onResult,
}: CopyBatchTextActionProps) {
  const { copy, unavailable } = useCopyBatchText({
    disabled,
    onCopy,
    onResult,
  })

  return (
    <Button className={className} disabled={unavailable} onClick={copy} size={size}>
      {label}
    </Button>
  )
}
