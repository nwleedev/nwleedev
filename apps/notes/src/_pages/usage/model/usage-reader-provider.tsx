"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type { TextUsageReader } from "@/entities/usage"

const UsageReaderContext = createContext<TextUsageReader | null>(null)

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

export function useUsageReader() {
  const reader = useContext(UsageReaderContext)

  if (reader === null) {
    throw new Error("useUsageReader must be used within UsageReaderProvider")
  }

  return reader
}
