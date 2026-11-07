"use client"

import type { PropsWithChildren } from "react"

import {
  NoteSessionCommandsContext,
  NoteSessionStateContext,
  useNoteSessionStateModel,
} from "./use-note-session-state"

export function NoteSessionProvider({ children }: PropsWithChildren) {
  const { commands, state } = useNoteSessionStateModel(Date.now)

  return (
    <NoteSessionCommandsContext value={commands}>
      <NoteSessionStateContext value={state}>{children}</NoteSessionStateContext>
    </NoteSessionCommandsContext>
  )
}

export {
  useNoteSession,
  useNoteSessionCommands,
  useNoteSessionState,
} from "./use-note-session-state"
