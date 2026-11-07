import { useNoteCardParts } from "../model/note-card-context"

export function NoteCardBody() {
  const { contentId, editor, prepareContentShortcut, runContentShortcut } = useNoteCardParts()

  return (
    <textarea
      aria-label="메모 내용"
      className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent px-4 pb-3 pt-1 text-base leading-7 text-text outline-none placeholder:text-soft-ink"
      id={contentId}
      onClick={runContentShortcut}
      onMouseDown={prepareContentShortcut}
      placeholder="메모를 입력하세요"
      onCompositionStart={editor.autosave.pause}
      onCompositionEnd={editor.autosave.resume}
      {...editor.registration}
    />
  )
}
