import { NotesWorkspaceFrame } from "@/_app/index.server"
import { NotesStartPage } from "@/_pages/notes/index.browser"

export default function Page() {
  return (
    <NotesWorkspaceFrame>
      <NotesStartPage />
    </NotesWorkspaceFrame>
  )
}
