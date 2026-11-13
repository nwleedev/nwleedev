import { useCallback, useState } from "react"
import { Link } from "react-router"

import type { Asset, MemoUpdate, PlacementGeometry, ProjectDocument } from "@/entities/project"
import { imageSizeAtWidth } from "@/entities/project"

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
  const [placementFailed, setPlacementFailed] = useState(false)
  const placement = document.placements.find(({ id }) => id === selected) ?? document.placements[0]
  const selectedId = placement?.id
  const original = document.assets.find(({ id }) => id === placement?.assetId)
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(() => new Map())
  const preserve = useCallback((id: string, value: string) => {
    setUnsaved((previous) => new Map(previous).set(id, value))
  }, [])

  async function editPlacement(id: string, change: PlacementGeometry) {
    try {
      await updatePlacement(id, change)
      setPlacementFailed(false)
    } catch {
      setPlacementFailed(true)
    }
  }

  return (
    <main>
      <Link to="/">프로젝트 목록</Link>
      <h1>{document.project.title}</h1>
      <ImageUpload add={async (image) => {
        await addImage(image)
        select(image.id)
      }} />
      <div className="editor-workspace">
        <CanvasStage document={document} selectedId={selectedId} onSelect={select} onEdit={editPlacement} />
        <aside className="editor-inspector" aria-label="이미지 속성">
          {placementFailed && <p role="alert">이미지 배치를 저장하지 못했습니다.</p>}
          {placement && original && (
            <label>
              이미지 너비 (px)
              <input
                key={`${placement.id}:${placement.width}`}
                type="number"
                min={1}
                max={original.originalWidth}
                step="any"
                defaultValue={placement.width}
                onBlur={({ currentTarget }) => {
                  const width = currentTarget.valueAsNumber
                  if (!currentTarget.validity.valid || !Number.isFinite(width)) {
                    currentTarget.value = String(placement.width)
                    return
                  }
                  if (width !== placement.width) {
                    void editPlacement(placement.id, { kind: "size", ...imageSizeAtWidth(original, width) })
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
              />
            </label>
          )}
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
