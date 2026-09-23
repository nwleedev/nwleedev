import { DocumentPageFrame } from "@/_app"
import { SettingsStartPage } from "@/_pages/settings"

export default function Page() {
  return (
    <DocumentPageFrame pathname="/settings">
      <SettingsStartPage />
    </DocumentPageFrame>
  )
}
