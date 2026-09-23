import { TaskPageFrame } from "@/_app"
import { BatchCopyStartPage } from "@/_pages/batch-copy"

export default function Page() {
  return (
    <TaskPageFrame pathname="/batch-copy">
      <BatchCopyStartPage />
    </TaskPageFrame>
  )
}
