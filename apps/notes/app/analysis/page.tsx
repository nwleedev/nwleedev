import { DocumentPageFrame } from "@/_app/index.server"
import { AnalysisStartPage } from "@/_pages/analysis/index.browser"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/analysis">
      <AnalysisStartPage />
    </DocumentPageFrame>
  )
}
