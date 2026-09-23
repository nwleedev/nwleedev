import type { RefObject } from "react"

import { IconButton } from "@/shared/ui/icon-button"
import {
  ArrowBackIcon,
  FitViewIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/shared/ui/icons"

type NotesBoardControlsProps = {
  controlsRef: RefObject<HTMLDivElement | null>
  scaleText: string
  onAdjustScale(change: number): void
  onFitAllNotes(): void
  onMoveView(x: number, y: number): void
}

const VIEW_PAN_STEP = 48
const VIEW_SCALE_STEP = 0.1

export function NotesBoardControls({
  controlsRef,
  onAdjustScale,
  onFitAllNotes,
  onMoveView,
  scaleText,
}: NotesBoardControlsProps) {
  return (
    <div
      aria-label="캔버스 보기"
      className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-panel border border-border bg-surface-raised p-2 shadow-floating [&_button>svg]:size-5"
      ref={controlsRef}
      role="group"
    >
      <IconButton
        aria-label="왼쪽 보기"
        onClick={() => onMoveView(VIEW_PAN_STEP, 0)}
        title="왼쪽 보기"
      >
        <ArrowBackIcon />
      </IconButton>
      <IconButton
        aria-label="오른쪽 보기"
        onClick={() => onMoveView(-VIEW_PAN_STEP, 0)}
        title="오른쪽 보기"
      >
        <ArrowBackIcon className="rotate-180" />
      </IconButton>
      <IconButton
        aria-label="위 보기"
        onClick={() => onMoveView(0, VIEW_PAN_STEP)}
        title="위 보기"
      >
        <ArrowBackIcon className="rotate-90" />
      </IconButton>
      <IconButton
        aria-label="아래 보기"
        onClick={() => onMoveView(0, -VIEW_PAN_STEP)}
        title="아래 보기"
      >
        <ArrowBackIcon className="-rotate-90" />
      </IconButton>
      <IconButton
        aria-label="축소"
        onClick={() => onAdjustScale(-VIEW_SCALE_STEP)}
        title="축소"
      >
        <ZoomOutIcon />
      </IconButton>
      <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-soft-ink">
        {scaleText}
      </span>
      <IconButton
        aria-label="확대"
        onClick={() => onAdjustScale(VIEW_SCALE_STEP)}
        title="확대"
      >
        <ZoomInIcon />
      </IconButton>
      <IconButton
        aria-label="모두 보기"
        onClick={onFitAllNotes}
        title="모두 보기"
      >
        <FitViewIcon />
      </IconButton>
    </div>
  )
}
