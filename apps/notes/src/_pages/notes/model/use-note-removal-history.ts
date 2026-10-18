import { useCallback, useState } from "react"

import {
  createNoteRemovalHistory,
  dismissNoteRemovalHistory,
  forgetRemovedNote,
  rememberRemovedNote,
  type Note,
  type MobileNotePosition,
  type RemovedNoteSnapshot,
} from "@/entities/note"

export function useNoteRemovalHistory(now: () => string) {
  const [removalHistory, setRemovalHistory] = useState(
    createNoteRemovalHistory,
  )

  const rememberRemoval = useCallback((note: Note, mobilePosition?: MobileNotePosition) => {
    const removedAt = now()
    setRemovalHistory((current) =>
      rememberRemovedNote(current, note, removedAt, mobilePosition),
    )
    return { note, removedAt, mobilePosition }
  }, [now])

  const forgetRemoval = useCallback((snapshot: RemovedNoteSnapshot) => {
    setRemovalHistory((current) => forgetRemovedNote(current, snapshot))
  }, [])

  const dismissRemovalNotice = useCallback(() => {
    setRemovalHistory(dismissNoteRemovalHistory)
  }, [])

  return {
    removals: removalHistory.entries,
    dismissRemovalNotice,
    forgetRemoval,
    rememberRemoval,
  }
}
