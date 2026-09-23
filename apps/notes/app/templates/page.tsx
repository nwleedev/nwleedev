import { DocumentPageFrame } from "@/_app"
import { TemplatesStartPage } from "@/_pages/templates"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/templates">
      <TemplatesStartPage />
    </DocumentPageFrame>
  )
}
