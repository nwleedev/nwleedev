import type { ReactNode } from "react"

type StatusNoticeProps = {
  action?: ReactNode
  children: ReactNode
  kind?: "error" | "status"
}

export function StatusNotice({
  action,
  children,
  kind = "status",
}: StatusNoticeProps) {
  return (
    <div
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={`flex flex-wrap items-center justify-between gap-4 border-l-[0.35rem] bg-surface px-5 py-4 text-sm leading-6 ${kind === "error" ? "border-danger" : "border-notice"}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <p>{children}</p>
      {action}
    </div>
  )
}
