"use client"

import { useRouter } from "next/navigation"
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from "react"
import { useForm } from "react-hook-form"

import type { Note } from "@/entities/note"
import { useNavigationGuard } from "@/features/navigation-guard"

import type {
  SaveNoteContentFailureReason,
  SaveNoteContentResult,
} from "./save-note-content"

const DRAFT_SAVE_DELAY_MS = 800
const SAVED_LABEL_DURATION_MS = 1_500

type NoteContentFields = {
  content: string
}

type NavigationState =
  | { phase: "editing" }
  | { continueNavigation(): void; phase: "confirming" | "discarding" }

export type NoteDetailFailure =
  | { kind: "discard" }
  | { kind: "draft" }
  | { kind: "save"; reason: SaveNoteContentFailureReason }

type UseNoteDetailEditingOptions = {
  initialContent: string
  note: Note
  saveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
}

export function useNoteDetailEditing({
  initialContent,
  note,
  saveContent,
  saveDraft,
}: UseNoteDetailEditingOptions) {
  const router = useRouter()
  const { registerNavigationGuard, requestNavigation } = useNavigationGuard()
  const {
    formState: { isSubmitting },
    getValues,
    handleSubmit,
    register,
    reset,
  } = useForm<NoteContentFields>({
    defaultValues: { content: initialContent },
  })
  const [failure, setFailure] = useState<NoteDetailFailure | null>(null)
  const [navigation, setNavigation] = useState<NavigationState>({
    phase: "editing",
  })
  const [saved, setSaved] = useState(false)
  const continueButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const discardedDraft = useRef(false)
  const editor = useRef<HTMLTextAreaElement>(null)
  const noteReference = useRef(note)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogTitleId = useId()

  function clearDraftTimer() {
    if (draftTimer.current !== null) {
      clearTimeout(draftTimer.current)
      draftTimer.current = null
    }
  }

  function showSavedLabel() {
    if (savedTimer.current !== null) {
      clearTimeout(savedTimer.current)
    }

    setSaved(true)
    savedTimer.current = setTimeout(() => {
      savedTimer.current = null
      setSaved(false)
    }, SAVED_LABEL_DURATION_MS)
  }

  async function storeDraft() {
    if (discardedDraft.current) {
      return
    }

    clearDraftTimer()

    try {
      await saveDraft(noteReference.current.id, getValues("content"))
      setFailure((current) => current?.kind === "draft" ? null : current)
    } catch {
      setFailure({ kind: "draft" })
    }
  }

  const saveDraftOnExit = useEffectEvent(() => {
    if (!discardedDraft.current) {
      void saveDraft(noteReference.current.id, getValues("content")).catch(
        () => undefined,
      )
    }
  })

  useEffect(() => {
    noteReference.current = note
  }, [note])

  useEffect(() => {
    return registerNavigationGuard((continueNavigation) => {
      if (getValues("content") === noteReference.current.content) {
        return false
      }

      setNavigation((current) =>
        current.phase === "discarding"
          ? current
          : { continueNavigation, phase: "confirming" },
      )
      return true
    })
  }, [getValues, registerNavigationGuard])

  useEffect(() => {
    function storeDraftWhenHidden() {
      if (document.visibilityState === "hidden") {
        saveDraftOnExit()
      }
    }

    window.addEventListener("pagehide", saveDraftOnExit)
    document.addEventListener("visibilitychange", storeDraftWhenHidden)

    return () => {
      window.removeEventListener("pagehide", saveDraftOnExit)
      document.removeEventListener("visibilitychange", storeDraftWhenHidden)
      clearDraftTimer()

      if (savedTimer.current !== null) {
        clearTimeout(savedTimer.current)
      }

      saveDraftOnExit()
    }
  }, [])

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

  function scheduleDraft() {
    clearDraftTimer()
    setSaved(false)
    draftTimer.current = setTimeout(() => {
      draftTimer.current = null
      void storeDraft()
    }, DRAFT_SAVE_DELAY_MS)
  }

  async function save(fields: NoteContentFields) {
    clearDraftTimer()
    setFailure(null)
    const result = await saveContent(note.id, fields.content)

    if (result.status === "failure") {
      setFailure({ kind: "save", reason: result.reason })
      return
    }

    noteReference.current = result.note
    const latestContent = getValues("content")

    if (latestContent === fields.content) {
      reset({ content: result.note.content })
    } else {
      reset({ content: result.note.content }, { keepValues: true })
    }

    showSavedLabel()
  }

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
    clearDraftTimer()
    discardedDraft.current = true
    setNavigation({ continueNavigation, phase: "discarding" })

    try {
      await saveDraft(note.id, noteReference.current.content)
      dialog.current?.close()
      setNavigation({ phase: "editing" })
      continueNavigation()
    } catch {
      discardedDraft.current = false
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

  const contentRegistration = register("content")

  function changeContent(event: ReactChangeEvent<HTMLTextAreaElement>) {
    void contentRegistration.onChange(event)
    scheduleDraft()
  }

  function blurContent(event: ReactFocusEvent<HTMLTextAreaElement>) {
    void contentRegistration.onBlur(event)
    void storeDraft()
  }

  function connectEditor(element: HTMLTextAreaElement | null) {
    contentRegistration.ref(element)
    editor.current = element
  }

  function submitSave() {
    void handleSubmit(save)()
  }

  function retryFailure() {
    if (failure?.kind === "draft") {
      void storeDraft()
      return
    }

    if (failure?.kind === "discard") {
      void discardChanges()
      return
    }

    submitSave()
  }

  return {
    cancelDialog,
    changeContent,
    connectEditor,
    contentName: contentRegistration.name,
    continueButton,
    continueEditing,
    dialog,
    dialogTitleId,
    discardChanges,
    discarding: navigation.phase === "discarding",
    failure,
    navigationConfirmationVisible: navigation.phase !== "editing",
    onBlur: blurContent,
    requestBackNavigation,
    retryFailure,
    saveLabel: isSubmitting
      ? "저장하는 중"
      : saved
        ? "저장됨"
        : "저장",
    savePending: isSubmitting,
    submitSave,
  }
}
