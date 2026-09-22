import type { SaveNoteContentFailureReason } from "../model/save-note-content"

export function noteContentFailureMessage(reason: SaveNoteContentFailureReason) {
  if (reason === "draft-storage") {
    return "편집 중인 내용을 보관하지 못했습니다. 다시 시도하세요."
  }

  if (reason === "note-missing") {
    return "메모를 찾을 수 없어 저장하지 못했습니다."
  }

  return "메모를 저장하지 못했습니다. 다시 시도하세요."
}
