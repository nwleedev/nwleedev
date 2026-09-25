"use client"

import type { PropsWithChildren } from "react"

import {
  MobileBatchCopyContext,
  useMobileBatchCopyState,
  type MobileBatchCopyDependencies,
} from "./use-mobile-batch-copy-state"

export function MobileBatchCopyProvider({
  children,
  ...dependencies
}: PropsWithChildren<MobileBatchCopyDependencies>) {
  const value = useMobileBatchCopyState(dependencies)

  return <MobileBatchCopyContext value={value}>{children}</MobileBatchCopyContext>
}

export { useMobileBatchCopy } from "./use-mobile-batch-copy-state"
