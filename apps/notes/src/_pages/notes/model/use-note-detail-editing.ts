"use client"

import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type ChangeEvent as ReactChangeEvent,
} from "react"
import { useForm } from "react-hook-form"

import type { Note } from "@/entities/note"
import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteContentAutosave } from "./use-note-content-autosave"
import { useNoteEditHistory } from "./use-note-edit-history"
import { useNoteDetailNavigation } from "./use-note-detail-navigation"

type NoteContentFields = {
  content: string
}


type UseNoteDetailEditingOptions = {
  editorRef: RefObject<HTMLTextAreaElement | null>
  note: Note
  saveContent(
    note: Note,
    content: string,
  ): Promise<SaveNoteContentResult>
}

export function useNoteDetailEditing({
  editorRef,
  note,
  saveContent,
}: UseNoteDetailEditingOptions) {
  const {
    getValues,
    setValue,
    register,
    reset,
  } = useForm<NoteContentFields>({
    defaultValues: { content: note.content },
  })
  const noteReference = useRef(note)
  const readContent = useCallback(() => getValues("content"), [getValues])
  const autosave = useNoteContentAutosave({
    note,
    onContentSaved(content) {
      reset({ content }, { keepFieldsRef: true })
    },
    editor: editorRef,
    receiveNote(previous, saved) {
      history.receiveNote(previous, saved)
      setValue("content", saved.content)
    },
    onSave: saveContent,
    readContent,
    saveOnExit: false,
  })
  const navigation = useNoteDetailNavigation({
    editor: editorRef,
    noteReference,
    readContent,
    stopSaving: autosave.stop,
  })
  const history = useNoteEditHistory({
    editor: editorRef,
    readContent,
    replaceContent(content) {
      setValue("content", content, { shouldDirty: true })
      autosave.scheduleSave()
    },
  })

  useEffect(() => { noteReference.current = note }, [note])

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
    if (editorRef.current) setValue("content", editorRef.current.value, { shouldDirty: true })
    autosave.resume()
  }

  const connectEditor = useCallback((element: HTMLTextAreaElement | null) => {
    register("content").ref(element)
    editorRef.current = element
  }, [editorRef, register])

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
    saveLabel: autosave.pending ? "저장 중" as const : "저장됨" as const,
    history,
  }
}
