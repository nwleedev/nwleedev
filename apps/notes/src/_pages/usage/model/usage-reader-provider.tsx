"use client"

import type { PropsWithChildren } from "react"

import type { TextUsageReader } from "@/entities/usage"

import { UsageReaderContext } from "./use-usage-reader"

type UsageReaderProviderProps = PropsWithChildren<{
  reader: TextUsageReader
}>

export function UsageReaderProvider({
  children,
  reader,
}: UsageReaderProviderProps) {
  return (
    <UsageReaderContext value={reader}>
      {children}
    </UsageReaderContext>
  )
}

export { useUsageReader } from "./use-usage-reader"
