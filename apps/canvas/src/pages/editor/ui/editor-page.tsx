import { useCallback, useRef, useState } from "react"
import { Link } from "react-router"

import type { Asset, Memo, MemoUpdate, PlacementGeometry, ProjectDocument, Size } from "@/entities/project"
import { imageSizeAtWidth } from "@/entities/project"

import type { Region, RenderExport } from "../model/export-request"
import { ImageExport } from "./image-export"
import { CanvasStage } from "./canvas-stage"
import { ImageUpload } from "./image-upload"
import { MemoAttachment } from "./memo-attachment"
import { MemoField } from "./memo-field"
import { ProjectDownload } from "./project-download"

import "./editor-page.css"

type Props = {
  document: ProjectDocument
  saveMemo: (update: MemoUpdate) => Promise<void>
  updatePlacement: (id: string, change: PlacementGeometry) => Promise<void>
  addImage: (image: Omit<Asset, "projectId">) => Promise<void>
  addMemo: (placementId: string) => Promise<void>
  updateMemoSide: (memoId: string, side: Memo["side"]) => Promise<void>
  updateMemoSize: (memoId: string, size: Size) => Promise<void>
  prepareArchive: () => Promise<Blob>
  renderExport: RenderExport
}

export function EditorPage({ document, saveMemo, updatePlacement, addImage, addMemo, updateMemoSide, updateMemoSize, prepareArchive, renderExport }: Props) {
  const [exporting, setExporting] = useState(false)
  const [scope, setScope] = useState<"all" | Region["kind"]>("all")
  const [region, setRegion] = useState<Region>()
  const [selected, select] = useState<string>()
  const [placementFailed, setPlacementFailed] = useState(false)
  const [memoResizeFailed, setMemoResizeFailed] = useState(false)
  const placement = document.placements.find(({ id }) => id === selected)
  const selectedId = placement?.id
  const memo = document.memos.find(({ placementId }) => placementId === selectedId)
  const original = document.assets.find(({ id }) => id === placement?.assetId)
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(() => new Map())
  const memoFlushes = useRef(new Map<string, () => Promise<void>>())
  const registerFlush = useCallback((id: string, flush: () => Promise<void>) => {
    const flushes = memoFlushes.current
    flushes.set(id, flush)
    return () => { flushes.delete(id) }
  }, [])
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
      <header className="editor-header">
        <div className="editor-document">
          <Link to="/">프로젝트 목록</Link>
          <h1>{document.project.title}</h1>
        </div>
        <ImageUpload add={async (image) => {
          await addImage(image)
          select(image.id)
        }} />
        <div className="editor-file-actions">
          <ProjectDownload title={document.project.title} prepare={async () => {
            await Promise.all(Array.from(memoFlushes.current.values(), (flush) => flush()))
            return prepareArchive()
          }} />
          <button className="image-export-trigger" type="button" aria-expanded={exporting} onClick={() => setExporting(!exporting)}>이미지 내보내기</button>
        </div>
      </header>
      <div className="editor-workspace">
        <CanvasStage
          document={document}
          selection={exporting && scope !== "all" ? scope : undefined}
          onRegion={setRegion}
          selectedId={selectedId}
          onSelect={select}
          onEdit={editPlacement}
          onResizeMemo={async (id, size) => {
            try {
              await updateMemoSize(id, size)
              setMemoResizeFailed(false)
            } catch {
              setMemoResizeFailed(true)
            }
          }}
        />
        {exporting ? <ImageExport
          document={document}
          scope={scope}
          region={region}
          selectScope={(next) => {
            setRegion(undefined)
            setScope(next)
          }}
          render={renderExport}
          close={() => setExporting(false)}
        /> : <aside className="editor-inspector" aria-label="이미지 속성">
          {placementFailed && <p role="alert">이미지 배치를 저장하지 못했습니다.</p>}
          {memoResizeFailed && <p role="alert">메모 크기를 저장하지 못했습니다.</p>}
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
          {placement && (
            <MemoAttachment
              key={placement.id}
              memo={memo}
              onAdd={() => addMemo(placement.id)}
              onChange={updateMemoSide}
            />
          )}
          {document.memos.map(({ id, placementId }) => (
            <div key={id} hidden={placementId !== selectedId}>
              <MemoField
                memoId={id}
                updates={document.memoUpdates.filter((update) => update.memoId === id)}
                save={saveMemo}
                preserve={preserve}
                registerFlush={registerFlush}
              />
            </div>
          ))}
        </aside>}
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
