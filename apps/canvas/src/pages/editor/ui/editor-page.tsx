import { useCallback, useState } from "react"
import { Link } from "react-router"

import type { MemoUpdate, ProjectDocument } from "@/entities/project"

import { MemoField } from "./memo-field"

type Props = {
  document: ProjectDocument
  saveMemo: (update: MemoUpdate) => Promise<void>
}

export function EditorPage({ document, saveMemo }: Props) {
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(() => new Map())
  const preserve = useCallback((id: string, value: string) => {
    setUnsaved((previous) => new Map(previous).set(id, value))
  }, [])

  return (
    <main>
      <Link to="/">프로젝트 목록</Link>
      <h1>{document.project.title}</h1>
      {document.memos.map(({ id }) => (
        <MemoField
          key={id}
          memoId={id}
          updates={document.memoUpdates.filter((update) => update.memoId === id)}
          save={saveMemo}
          preserve={preserve}
        />
      ))}
      {Array.from(unsaved, ([id, value]) => (
        <label key={id}>
          저장하지 못한 메모
          <textarea readOnly value={value} />
        </label>
      ))}
    </main>
  )
}
