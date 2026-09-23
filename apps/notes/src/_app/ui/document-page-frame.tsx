import type { ReactNode } from "react"

import { DocumentNavigation } from "@/widgets/application-navigation"

type DocumentPageFrameProps = {
  children: ReactNode
  pathname: string
}

export function DocumentPageFrame({ children, pathname }: DocumentPageFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DocumentNavigation pathname={pathname} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
