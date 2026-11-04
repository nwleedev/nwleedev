import type { RefObject } from "react"

import { useBatchCopyPanelWidth } from "../model/use-batch-copy-panel-width"
import { INLINE_PANEL_ID } from "../model/use-batch-copy-panel"

type BatchCopyPanelResizeProps = { container: RefObject<HTMLElement | null> }

export function BatchCopyPanelResize({ container }: BatchCopyPanelResizeProps) {
  const { dimensions, onPointerDown, onPointerMove, onPointerUp, onKeyDown, cancel } = useBatchCopyPanelWidth(container)

  return (
    <div
      aria-controls={INLINE_PANEL_ID}
      aria-label="일괄 복사 너비"
      aria-orientation="vertical"
      aria-valuemin={280}
      aria-valuemax={dimensions.maximum}
      aria-valuenow={Math.round(dimensions.width)}
      aria-valuetext={`${Math.round(dimensions.width)}픽셀`}
      className="absolute inset-y-0 -left-1 z-30 w-2 cursor-col-resize touch-none hover:bg-accent/20 focus-visible:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      onKeyDown={onKeyDown}
      onLostPointerCapture={cancel}
      onPointerCancel={cancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      tabIndex={0}
    />
  )
}
