"use client"

import { useRouter } from "next/navigation"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SyntheticEvent,
} from "react"

import type { Note } from "@/entities/note"
import { useNavigationGuard } from "@/features/navigation-guard"


type NavigationState =
  | { phase: "editing" }
  | { continueNavigation(): void; phase: "confirming" }

type NoteDetailNavigationOptions = {
  editor: RefObject<HTMLTextAreaElement | null>
  noteReference: RefObject<Note>
  readContent(): string
  stopSaving(): void
}

export function useNoteDetailNavigation({
  editor,
  noteReference,
  readContent,
  stopSaving,
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
    function confirmUnload(event: BeforeUnloadEvent) {
      if (readContent() === noteReference.current.content) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", confirmUnload)
    return () => window.removeEventListener("beforeunload", confirmUnload)
  }, [noteReference, readContent])

  useEffect(() => {
    return registerNavigationGuard((continueNavigation) => {
      if (readContent() === noteReference.current.content) {
        return false
      }

      setNavigation({ continueNavigation, phase: "confirming" })
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

  function discardChanges() {
    if (navigation.phase !== "confirming") return
    const continueNavigation = navigation.continueNavigation
    stopSaving()
    dialog.current?.close()
    setNavigation({ phase: "editing" })
    continueNavigation()
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
    navigationConfirmationVisible: navigation.phase !== "editing",
    requestBackNavigation,
  }
}
