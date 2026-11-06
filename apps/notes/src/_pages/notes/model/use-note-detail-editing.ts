"use client"

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent as ReactChangeEvent,
} from "react"
import { useForm } from "react-hook-form"

import type { Note } from "@/entities/note"
import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteContentAutosave } from "./use-note-content-autosave"
import { useNoteEditHistory } from "./use-note-edit-history"
import { useNoteDetailDraft } from "./use-note-detail-draft"
import { useNoteDetailNavigation } from "./use-note-detail-navigation"

type NoteContentFields = {
  content: string
}


type UseNoteDetailEditingOptions = {
  initialContent: string
  note: Note
  saveContent(
    note: Note,
    content: string,
  ): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
  discardDraft(noteId: string): Promise<void>
}

export function useNoteDetailEditing({
  initialContent,
  note,
  saveContent,
  saveDraft,
  discardDraft,
}: UseNoteDetailEditingOptions) {
  const {
    getValues,
    setValue,
    register,
    reset,
  } = useForm<NoteContentFields>({
    defaultValues: { content: initialContent },
  })
  const editor = useRef<HTMLTextAreaElement>(null)
  const noteReference = useRef(note)
  const readContent = useCallback(() => getValues("content"), [getValues])
  const draft = useNoteDetailDraft({
    noteReference,
    readContent,
    saveDraft,
    discardStoredDraft: discardDraft,
  })
  const autosave = useNoteContentAutosave({
    initialContent,
    note,
    onContentSaved(content) {
      reset({ content }, { keepFieldsRef: true })
    },
    editor,
    receiveNote(previous, saved) {
      history.receiveNote(previous, saved)
      setValue("content", saved.content)
    },
    onSave: saveContent,
    readContent,
    saveOnExit: false,
  })
  const navigation = useNoteDetailNavigation({
    discardDraft: draft.discardDraft,
    editor,
    noteId: note.id,
    noteReference,
    readContent,
    stopSaving: autosave.stop,
  })
  const history = useNoteEditHistory({
    editor,
    readContent,
    replaceContent(content) {
      setValue("content", content, { shouldDirty: true })
      autosave.scheduleSave()
    },
  })

  const { scheduleSave } = autosave
  useEffect(() => { noteReference.current = note }, [note])
  useEffect(() => {
    if (initialContent !== noteReference.current.content) scheduleSave()
  }, [initialContent, scheduleSave])

  const contentRegistration = register("content")

  function changeContent(event: ReactChangeEvent<HTMLTextAreaElement>) {
    const inputType = event.nativeEvent instanceof InputEvent ? event.nativeEvent.inputType : ""
    history.record(event.currentTarget, inputType)
    void contentRegistration.onChange(event)
    if (!history.available.composing) autosave.scheduleSave()
  }

  function startComposition() {
    autosave.pause()
    history.startComposition()
  }

  function endComposition() {
    history.endComposition()
    if (editor.current) setValue("content", editor.current.value, { shouldDirty: true })
    autosave.resume()
  }

  const connectEditor = useCallback((element: HTMLTextAreaElement | null) => {
    register("content").ref(element)
    editor.current = element
  }, [register])

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
    navigationConfirmationVisible: navigation.navigationConfirmationVisible,
    onBlur: contentRegistration.onBlur,
    requestBackNavigation: navigation.requestBackNavigation,
    startComposition,
    endComposition,
    saveLabel: autosave.pending ? "저장 중" : "저장됨",
    history,
  }
}
