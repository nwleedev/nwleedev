"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type FocusEvent as ReactFocusEvent,
} from "react"
import { useForm } from "react-hook-form"

import type { Note } from "@/entities/note"
import type { NoteDetailFailure } from "./note-detail-failure"
import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteDetailDraft } from "./use-note-detail-draft"
import { useNoteDetailNavigation } from "./use-note-detail-navigation"

const SAVED_LABEL_DURATION_MS = 1_500

type NoteContentFields = {
  content: string
}

export type { NoteDetailFailure } from "./note-detail-failure"

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
  const [saved, setSaved] = useState(false)
  const editor = useRef<HTMLTextAreaElement>(null)
  const noteReference = useRef(note)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readContent = useCallback(() => getValues("content"), [getValues])
  const draft = useNoteDetailDraft({
    noteReference,
    readContent,
    saveDraft,
    setFailure,
  })
  const navigation = useNoteDetailNavigation({
    discardDraft: draft.discardDraft,
    editor,
    noteId: note.id,
    noteReference,
    readContent,
    setFailure,
  })

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

  useEffect(() => {
    noteReference.current = note
  }, [note])

  useEffect(() => {
    return () => {
      if (savedTimer.current !== null) {
        clearTimeout(savedTimer.current)
      }
    }
  }, [])

  async function save(fields: NoteContentFields) {
    draft.clearDraftTimer()
    setFailure(null)
    const result = await saveContent(note.id, fields.content)

    if (result.status === "failure") {
      setFailure({ kind: "save", reason: result.reason })
      return
    }

    noteReference.current = result.note
    const latestContent = getValues("content")

    if (latestContent === fields.content) {
      reset({ content: result.note.content }, { keepFieldsRef: true })
    } else {
      reset(
        { content: result.note.content },
        { keepFieldsRef: true, keepValues: true },
      )
    }

    showSavedLabel()
  }

  const contentRegistration = register("content")

  function changeContent(event: ReactChangeEvent<HTMLTextAreaElement>) {
    void contentRegistration.onChange(event)
    setSaved(false)
    draft.scheduleDraft()
  }

  function blurContent(event: ReactFocusEvent<HTMLTextAreaElement>) {
    void contentRegistration.onBlur(event)
    void draft.storeDraft()
  }

  const connectEditor = useCallback((element: HTMLTextAreaElement | null) => {
    register("content").ref(element)
    editor.current = element
  }, [register])

  function submitSave() {
    void handleSubmit(save)()
  }

  function retryFailure() {
    if (failure?.kind === "draft") {
      void draft.storeDraft()
      return
    }

    if (failure?.kind === "discard") {
      void navigation.discardChanges()
      return
    }

    submitSave()
  }

  return {
    cancelDialog: navigation.cancelDialog,
    changeContent,
    connectEditor,
    contentName: contentRegistration.name,
    continueButton: navigation.continueButton,
    continueEditing: navigation.continueEditing,
    dialog: navigation.dialog,
    dialogTitleId: navigation.dialogTitleId,
    discardChanges: navigation.discardChanges,
    discarding: navigation.discarding,
    failure,
    navigationConfirmationVisible: navigation.navigationConfirmationVisible,
    onBlur: blurContent,
    requestBackNavigation: navigation.requestBackNavigation,
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
