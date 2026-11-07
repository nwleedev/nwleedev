"use client"

import type { PropsWithChildren } from "react"

import { useInteractionPreferences } from "@/entities/preference/index.browser"
import { useBrowserMobileBatchCopy } from "../api/use-browser-mobile-batch-copy"

import {
  MobileBatchCopyContext,
  useMobileBatchCopyState,
} from "./use-mobile-batch-copy-state"

export function MobileBatchCopyProvider({
  children,
}: PropsWithChildren) {
  const dependencies = useBrowserMobileBatchCopy()
  const state = useInteractionPreferences()
  const reorderButtonsEnabled = "preferences" in state
    ? state.preferences.batchCopyReorderButtonsEnabled
    : false
  const value = useMobileBatchCopyState({ ...dependencies, reorderButtonsEnabled })

  return <MobileBatchCopyContext value={value}>{children}</MobileBatchCopyContext>
}

export { useMobileBatchCopy } from "./use-mobile-batch-copy-state"
