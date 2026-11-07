import { PANEL_DEFAULT_WIDTH_PX, PANEL_MAX_WIDTH_PX, PANEL_MIN_WIDTH_PX } from "../model/batch-copy-panel-dimensions"

const storageKey = "notes.batch-copy-panel-width"

export function readPanelWidth(): number {
  try {
    const width = Number(localStorage.getItem(storageKey))
    if (Number.isFinite(width) && width >= PANEL_MIN_WIDTH_PX) return Math.min(width, PANEL_MAX_WIDTH_PX)
  } catch {}
  return PANEL_DEFAULT_WIDTH_PX
}

export function savePanelWidth(width: number): void {
  try {
    localStorage.setItem(storageKey, String(width))
  } catch {}
}
