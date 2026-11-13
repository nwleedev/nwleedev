import { Link } from "react-router"

import type { MemoUpdate, ProjectDocument } from "@/entities/project"

import { MemoField } from "./memo-field"

type Props = {
  document: ProjectDocument
  saveMemo: (update: MemoUpdate) => Promise<void>
}

export function EditorPage({ document, saveMemo }: Props) {
  return (
    <main>
      <Link to="/">프로젝트 목록</Link>
      <h1>{document.project.title}</h1>
      {document.memos.map(({ id }) => (
        <MemoField key={id} memoId={id} updates={document.memoUpdates.filter((update) => update.memoId === id)} save={saveMemo} />
      ))}
    </main>
  )
}
