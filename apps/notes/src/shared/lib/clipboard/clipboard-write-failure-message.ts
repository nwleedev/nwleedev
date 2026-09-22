import type { ClipboardWriteFailureReason } from "./clipboard-writer"

export function clipboardWriteFailureMessage(
  reason: ClipboardWriteFailureReason,
) {
  if (reason === "api-unavailable") {
    return "이 브라우저에서는 클립보드에 복사할 수 없습니다. 텍스트를 직접 선택해 복사하세요."
  }

  if (reason === "not-allowed") {
    return "브라우저가 클립보드 쓰기를 허용하지 않았습니다. 주소 표시줄의 사이트 권한을 확인한 뒤 다시 시도하세요."
  }

  return "클립보드에 쓰는 중 오류가 발생했습니다. 텍스트를 직접 선택해 복사하거나 다시 시도하세요."
}
