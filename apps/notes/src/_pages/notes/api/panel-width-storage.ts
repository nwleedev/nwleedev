const storageKey = "notes.batch-copy-panel-width"

export function readPanelWidth(): number {
  try {
    const width = Number(localStorage.getItem(storageKey))
    if (Number.isFinite(width) && width >= 280) return Math.min(width, 640)
  } catch {}
  return 320
}

export function savePanelWidth(width: number): void {
  try {
    localStorage.setItem(storageKey, String(width))
  } catch {}
}
