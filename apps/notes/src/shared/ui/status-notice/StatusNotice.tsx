import type { PropsWithChildren } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

type StatusNoticeProps = PropsWithChildren<{
  kind?: "error" | "status"
}>

export function StatusNotice({
  children,
  kind = "status",
}: StatusNoticeProps) {
  const noticeClassName = joinClassNames(
    "flex flex-wrap items-center justify-between gap-4 border-l-[0.35rem] bg-surface px-5 py-4 text-sm leading-6",
    kind === "error" ? "border-danger" : "border-notice",
  )

  return (
    <div
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={noticeClassName}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  )
}
