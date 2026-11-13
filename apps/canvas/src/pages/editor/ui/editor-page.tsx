import { Input } from "react-aria-components/Input"
import { Label } from "react-aria-components/Label"
import { TextArea } from "react-aria-components/TextArea"
import { TextField } from "react-aria-components/TextField"
import { Button } from "react-aria-components/Button"
import { useCallback, useRef, useState } from "react"
import { Link } from "react-router"

import type { Asset, Memo, MemoUpdate, PlacementGeometry, ProjectDocument, Size } from "@/entities/project"
import { imageSizeAtWidth } from "@/entities/project"
import { BlobImage } from "@/shared/ui"

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
  readSavedRevision: () => Promise<number>
  renderExport: RenderExport
}

export function EditorPage({ document, saveMemo, updatePlacement, addImage, addMemo, updateMemoSide, updateMemoSize, prepareArchive, readSavedRevision, renderExport }: Props) {
  const [exportRevision, setExportRevision] = useState<number>()
  const exporting = exportRevision !== undefined && document.project.revision >= exportRevision
  const [openingExport, setOpeningExport] = useState(false)
  const [exportOpenFailed, setExportOpenFailed] = useState(false)
  const [zoomHost, setZoomHost] = useState<HTMLDivElement | null>(null)
  const [scope, setScope] = useState<"all" | Region["kind"]>("all")
  const [region, setRegion] = useState<Region>()
  const [inspectorOpen, setInspectorOpen] = useState(false)
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

  async function flushMemos() {
    await Promise.all(Array.from(memoFlushes.current.values(), (flush) => flush()))
  }

  async function toggleExport() {
    if (exporting) {
      setExportRevision(undefined)
      return
    }
    setOpeningExport(true)
    setExportOpenFailed(false)
    try {
      await flushMemos()
      setExportRevision(await readSavedRevision())
    } catch {
      setExportOpenFailed(true)
    } finally {
      setOpeningExport(false)
    }
  }

  async function editPlacement(id: string, change: PlacementGeometry) {
    try {
      await updatePlacement(id, change)
      setPlacementFailed(false)
    } catch {
      setPlacementFailed(true)
    }
  }

  return (
    <main className="editor-page">
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
            await flushMemos()
            return prepareArchive()
          }} />
          <div className="editor-output-actions">
            <div ref={setZoomHost} />
            <Button className="image-export-trigger" type="button" aria-expanded={exporting} isDisabled={openingExport || (exportRevision !== undefined && !exporting)} onPress={() => void toggleExport()}>이미지 내보내기</Button>
          </div>
        </div>
      </header>
      {exportOpenFailed && <p role="alert">메모를 저장하지 못했습니다. 이미지 내보내기를 다시 시도해 주세요.</p>}
      <div className="editor-workspace">
        <CanvasStage
          document={document}
          zoomHost={zoomHost}
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
        {!exporting && <div className="editor-touch-tools">
          <Button
            type="button"
            aria-expanded={inspectorOpen}
            aria-controls="editor-inspector"
            isDisabled={!selectedId && !inspectorOpen}
            onPress={() => setInspectorOpen(!inspectorOpen)}
          >
            {inspectorOpen ? "캔버스 편집" : "이미지 속성"}
          </Button>
        </div>}
        {exporting ? <ImageExport
          document={document}
          scope={scope}
          region={region}
          selectScope={(next) => {
            setRegion(undefined)
            setScope(next)
          }}
          render={renderExport}
          close={() => setExportRevision(undefined)}
        /> : <aside id="editor-inspector" className="editor-inspector" aria-label="이미지 속성" data-mobile-open={inspectorOpen}>
          {original && (
            <div className="editor-selection">
              <BlobImage original={original.original} alt="선택한 이미지" />
              <span>{original.originalWidth} × {original.originalHeight}px</span>
            </div>
          )}
          {placementFailed && <p role="alert">이미지 배치를 저장하지 못했습니다.</p>}
          {memoResizeFailed && <p role="alert">메모 크기를 저장하지 못했습니다.</p>}
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
          {placement && original && (
            <div className="editor-image-width">
              <TextField key={`${placement.id}:${placement.width}`} defaultValue={String(placement.width)}>
                <Label>이미지 너비 (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={original.originalWidth}
                  step="any"
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
              </TextField>
              <Button
                type="button"
                isDisabled={placement.width === original.originalWidth}
                onPress={() => void editPlacement(placement.id, {
                  kind: "size",
                  ...imageSizeAtWidth(original, original.originalWidth),
                })}
              >
                원본 크기로 복원
              </Button>
            </div>
          )}
        </aside>}
      </div>
      {Array.from(unsaved, ([id, value]) => (
        <TextField key={id} isReadOnly value={value}>
          <Label>저장하지 못한 메모</Label>
          <TextArea />
        </TextField>
      ))}
    </main>
  )
}
