import { DocumentPageFrame } from "@/_app"
import { AnalysisStartPage } from "@/_pages/analysis"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/analysis">
      <AnalysisStartPage />
    </DocumentPageFrame>
  )
}
