import { useCallback, useState } from "react"
import { Link } from "react-router"

import type { Asset, MemoUpdate, PlacementGeometry, ProjectDocument } from "@/entities/project"

import { CanvasStage } from "./canvas-stage"
import { ImageUpload } from "./image-upload"
import { MemoField } from "./memo-field"

import "./editor-page.css"

type Props = {
  document: ProjectDocument
  saveMemo: (update: MemoUpdate) => Promise<void>
  updatePlacement: (id: string, change: PlacementGeometry) => Promise<void>
  addImage: (image: Omit<Asset, "projectId">) => Promise<void>
}

export function EditorPage({ document, saveMemo, updatePlacement, addImage }: Props) {
  const [selected, select] = useState<string>()
  const [moveFailed, setMoveFailed] = useState(false)
  const selectedId = document.placements.find(({ id }) => id === selected)?.id ?? document.placements[0]?.id
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(() => new Map())
  const preserve = useCallback((id: string, value: string) => {
    setUnsaved((previous) => new Map(previous).set(id, value))
  }, [])

  return (
    <main>
      <Link to="/">프로젝트 목록</Link>
      <h1>{document.project.title}</h1>
      <ImageUpload add={async (image) => {
        await addImage(image)
        select(image.id)
      }} />
      <div className="editor-workspace">
        <CanvasStage document={document} selectedId={selectedId} onSelect={select} onMove={async (id, position) => {
          try {
            await updatePlacement(id, { kind: "position", ...position })
            setMoveFailed(false)
          } catch {
            setMoveFailed(true)
          }
        }} />
        <aside className="editor-inspector" aria-label="이미지 속성">
          {moveFailed && <p role="alert">이미지 위치를 저장하지 못했습니다.</p>}
          {document.memos.map(({ id, placementId }) => (
            <div key={id} hidden={placementId !== selectedId}>
              <MemoField
                memoId={id}
                updates={document.memoUpdates.filter((update) => update.memoId === id)}
                save={saveMemo}
                preserve={preserve}
              />
            </div>
          ))}
        </aside>
      </div>
      {Array.from(unsaved, ([id, value]) => (
        <label key={id}>
          저장하지 못한 메모
          <textarea readOnly value={value} />
        </label>
      ))}
    </main>
  )
}
