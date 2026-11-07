import { DocumentPageFrame } from "@/_app/index.server"
import { SettingsStartPage } from "@/_pages/settings/index.browser"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/settings">
      <SettingsStartPage />
    </DocumentPageFrame>
  )
}
