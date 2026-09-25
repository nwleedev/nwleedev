"use client"

import type { PropsWithChildren } from "react"

import {
  NoteSessionCommandsContext,
  NoteSessionStateContext,
  useNoteSessionStateModel,
} from "./use-note-session-state"

type NoteSessionProviderProps = PropsWithChildren<{
  now(): string
}>

export function NoteSessionProvider({ children, now }: NoteSessionProviderProps) {
  const { commands, state } = useNoteSessionStateModel(now)

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
