import { ActionPopover } from "@/shared/ui/action-popover"
import { IconButton } from "@/shared/ui/icon-button"
import { CopyIcon } from "@/shared/ui/icons"

import { useNoteCardParts } from "../model/note-card-context"
import { NoteStatusLight } from "./note-status-light"

function stopHeaderAction(event: { stopPropagation(): void }) {
  event.stopPropagation()
}

export function NoteCardHeader() {
  const {
    actions,
    commandPressed,
    controlsDisabled,
    copyCurrent,
    gesture,
    headerClassName,
    openPropertiesFromHeader,
    saveLabel,
    selectFromHeader,
  } = useNoteCardParts()

  return (
    <header className={headerClassName}>
      <button
        aria-label="메모 이동"
        className="h-full min-w-0 flex-1 cursor-grab touch-none rounded-tl-note disabled:cursor-default active:cursor-grabbing"
        disabled={controlsDisabled}
        onClick={selectFromHeader}
        onDoubleClick={openPropertiesFromHeader}
        onLostPointerCapture={gesture.cancel}
        onPointerCancel={gesture.cancel}
        onPointerDown={(event) => gesture.start(event, "move")}
        onPointerMove={gesture.move}
        onPointerUp={gesture.finish}
        tabIndex={-1}
        type="button"
      />
      <span className="note-card-status pointer-events-none absolute left-4 inline-flex items-center" role="status">
        <NoteStatusLight status={saveLabel} />
        <span className="sr-only">{saveLabel}</span>
      </span>
      <div
        className="flex items-center gap-0.5 pr-1.5"
        data-note-header-actions=""
        onClick={stopHeaderAction}
        onDoubleClick={stopHeaderAction}
        onPointerDown={stopHeaderAction}
      >
        <IconButton
          aria-label="메모 복사"
          className="h-6 w-6"
          disabled={controlsDisabled}
          onClick={copyCurrent}
          size="compact"
          tabIndex={commandPressed ? -1 : 0}
        >
          <CopyIcon />
        </IconButton>
        <ActionPopover
          actions={actions}
          disabled={controlsDisabled}
          label="메모 동작"
          triggerClassName="h-6 w-6"
        />
      </div>
    </header>
  )
}
