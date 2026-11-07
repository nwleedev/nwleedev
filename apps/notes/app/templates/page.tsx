import { DocumentPageFrame } from "@/_app/index.server"
import { TemplatesStartPage } from "@/_pages/templates/index.browser"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/templates">
      <TemplatesStartPage />
    </DocumentPageFrame>
  )
}
