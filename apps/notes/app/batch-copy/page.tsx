import { Suspense } from "react"

import { TaskPageFrame } from "@/_app"
import { BatchCopyStartPage } from "@/_pages/batch-copy"

export default function Page() {
  return (
    <TaskPageFrame pathname="/batch-copy">
      <Suspense fallback={<main className="grid h-full place-items-center bg-canvas" id="main-content"><p className="text-sm text-soft-ink" role="status">일괄 복사 불러오는 중</p></main>}>
        <BatchCopyStartPage />
      </Suspense>
    </TaskPageFrame>
  )
}
