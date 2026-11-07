import { NotesWorkspaceFrame } from "@/_app"
import { NotesStartPage } from "@/_pages/notes/index.browser"

export default function Page() {
  return (
    <NotesWorkspaceFrame>
      <NotesStartPage />
    </NotesWorkspaceFrame>
  )
}
