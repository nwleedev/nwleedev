const lightStyles = {
  "저장됨": "note-light is-saved",
  "저장 중": "note-light is-saving",
  "삭제됨": "note-light is-deleted",
}

export function NoteStatusLight({ status }: { status: keyof typeof lightStyles }) {
  return <span aria-hidden="true" className={lightStyles[status]} />
}
