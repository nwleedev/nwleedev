import { useEffect } from "react"

import { useNoteSessionCommands } from "@/_pages/notes/composition.browser"
import { useBatchCopyRemoval } from "@/features/batch-copy/index.browser"

export function BatchCopySelection() {
  const subscribe = useBatchCopyRemoval()
  const { forgetBatchCopyItem } = useNoteSessionCommands()

  useEffect(() => subscribe(forgetBatchCopyItem), [subscribe, forgetBatchCopyItem])

  return null
}
