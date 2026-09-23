import { TaskPageFrame } from "@/_app"
import { NoteDetailPage } from "@/_pages/notes"

type PageProps = {
  params: Promise<{ noteId: string }>
}

export default async function Page({ params }: PageProps) {
  const { noteId } = await params

  return (
    <TaskPageFrame pathname={`/notes/${noteId}`}>
      <NoteDetailPage noteId={noteId} />
    </TaskPageFrame>
  )
}
