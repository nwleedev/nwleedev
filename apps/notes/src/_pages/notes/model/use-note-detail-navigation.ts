"use client"

import { useRouter } from "next/navigation"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
} from "react"

import type { Note } from "@/entities/note"
import { useNavigationGuard } from "@/features/navigation-guard"

import type { NoteDetailFailure } from "./note-detail-failure"

type NavigationState =
  | { phase: "editing" }
  | { continueNavigation(): void; phase: "confirming" | "discarding" }

type NoteDetailNavigationOptions = {
  discardDraft(noteId: string): Promise<void>
  editor: RefObject<HTMLTextAreaElement | null>
  noteId: string
  noteReference: RefObject<Note>
  readContent(): string
  setFailure: Dispatch<SetStateAction<NoteDetailFailure | null>>
}

export function useNoteDetailNavigation({
  discardDraft,
  editor,
  noteId,
  noteReference,
  readContent,
  setFailure,
}: NoteDetailNavigationOptions) {
  const router = useRouter()
  const { registerNavigationGuard, requestNavigation } = useNavigationGuard()
  const [navigation, setNavigation] = useState<NavigationState>({
    phase: "editing",
  })
  const continueButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogTitleId = useId()

  useEffect(() => {
    return registerNavigationGuard((continueNavigation) => {
      if (readContent() === noteReference.current.content) {
        return false
      }

      setNavigation((current) =>
        current.phase === "discarding"
          ? current
          : { continueNavigation, phase: "confirming" },
      )
      return true
    })
  }, [readContent, registerNavigationGuard, noteReference])

  useEffect(() => {
    const element = dialog.current

    if (navigation.phase === "editing" || element === null) {
      return
    }

    if (!element.open) {
      element.showModal()
    }

    continueButton.current?.focus()
  }, [navigation])

  function requestBackNavigation(event: ReactMouseEvent<HTMLAnchorElement>) {
    const modifiedClick =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

    if (!modifiedClick && requestNavigation(() => router.push("/"))) {
      event.preventDefault()
    }
  }

  function continueEditing() {
    if (navigation.phase !== "confirming") {
      return
    }

    dialog.current?.close()
    setNavigation({ phase: "editing" })
    requestAnimationFrame(() => editor.current?.focus())
  }

  async function discardChanges() {
    if (navigation.phase !== "confirming") {
      return
    }

    const continueNavigation = navigation.continueNavigation
    setNavigation({ continueNavigation, phase: "discarding" })

    try {
      await discardDraft(noteId)
      dialog.current?.close()
      setNavigation({ phase: "editing" })
      continueNavigation()
    } catch {
      setNavigation({ continueNavigation, phase: "confirming" })
      setFailure({ kind: "discard" })
      requestAnimationFrame(() => continueButton.current?.focus())
    }
  }

  function cancelDialog(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()

    if (navigation.phase === "confirming") {
      continueEditing()
    }
  }

  return {
    cancelDialog,
    continueButton,
    continueEditing,
    dialog,
    dialogTitleId,
    discardChanges,
    discarding: navigation.phase === "discarding",
    navigationConfirmationVisible: navigation.phase !== "editing",
    requestBackNavigation,
  }
}
