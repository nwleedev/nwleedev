export function SkipLink() {
  return (
    <a
      className="fixed left-3 top-3 z-50 -translate-y-24 rounded-control bg-ink px-4 py-3 font-bold text-canvas focus:translate-y-0"
      href="#main-content"
      tabIndex={1}
    >
      본문으로 이동
    </a>
  )
}
