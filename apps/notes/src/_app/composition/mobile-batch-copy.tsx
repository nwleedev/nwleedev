import type { PropsWithChildren } from "react"

import { MobileBatchCopyProvider } from "@/features/add-note-to-batch-copy"

import { useMobileBatchCopyServices } from "./use-mobile-batch-copy-services"

type MobileBatchCopyProps = PropsWithChildren<{
  reorderButtonsEnabled: boolean
}>

export function MobileBatchCopy({
  children,
  reorderButtonsEnabled,
}: MobileBatchCopyProps) {
  const { clipboard, createId, now } =
    useMobileBatchCopyServices()

  return (
    <MobileBatchCopyProvider
      clipboard={clipboard}
      createId={createId}
      now={now}
      reorderButtonsEnabled={reorderButtonsEnabled}
    >
      {children}
    </MobileBatchCopyProvider>
  )
}
