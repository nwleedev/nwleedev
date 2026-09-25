import { createContext, useContext } from "react"

import type { TextUsageReader } from "@/entities/usage"

export const UsageReaderContext = createContext<TextUsageReader | null>(null)

export function useUsageReader() {
  const reader = useContext(UsageReaderContext)

  if (reader === null) {
    throw new Error("useUsageReader must be used within UsageReaderProvider")
  }

  return reader
}
