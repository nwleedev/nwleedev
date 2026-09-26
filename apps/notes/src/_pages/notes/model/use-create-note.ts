"use client"

import { useRef, useState } from "react"

import type { Note } from "@/entities/note"

import { useActionToast } from "@/shared/ui/action-toast"

export function useCreateNote(
  createNote: () => Promise<Note>,
  select: (noteId: string) => void,
) {
  const toast = useActionToast()
  const createButton = useRef<HTMLButtonElement>(null)
  const [creationPending, setCreationPending] = useState(false)

  async function createNoteOnce() {
    setCreationPending(true)

    try {
      return await createNote()
    } catch {
      toast.show({
        kind: "error",
        message: "메모를 만들지 못했습니다. 다시 시도하세요.",
      })
      return null
    } finally {
      setCreationPending(false)
    }
  }

  async function createNewNote() {
    const note = await createNoteOnce()

    if (note === null) {
      return
    }

    select(note.id)
    requestAnimationFrame(() => {
      document
        .getElementById(`note-${encodeURIComponent(note.id)}-content`)
        ?.focus({ preventScroll: true })
    })
  }

  async function createMobileNote() {
    await createNoteOnce()
  }

  return {
    createButton,
    createMobileNote,
    createNewNote,
    creationPending,
  }
}
