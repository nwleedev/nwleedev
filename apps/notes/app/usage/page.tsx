import { DocumentPageFrame } from "@/_app"
import { UsageStartPage } from "@/_pages/usage"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/usage">
      <UsageStartPage />
    </DocumentPageFrame>
  )
}
