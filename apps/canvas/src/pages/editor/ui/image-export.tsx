import { Button } from "react-aria-components/Button"
import { Input } from "react-aria-components/Input"
import { Label } from "react-aria-components/Label"
import { NumberField } from "react-aria-components/NumberField"
import { Slider, SliderThumb, SliderTrack } from "react-aria-components/Slider"
import { useEffect, useMemo, useState } from "react"

import type { ProjectDocument } from "@/entities/project"

import { Choice } from "@/shared/ui"
import { fitsOutput, maximumExportBytes, maximumExportMargin } from "@/shared/export"
import { exportImages, requestBounds, type ExportFormat, type ExportRequest, type ExportResult, type Region, type RenderExport } from "../model/export-request"
import { downloadBlob, downloadName } from "../model/download"

type Scope = "all" | Region["kind"]
type Props = {
  document: ProjectDocument
  region?: Region
  selectScope: (scope: Scope) => void
  scope: Scope
  render: RenderExport
  close: () => void
}
type Preview = { request: ExportRequest; result: ExportResult; url?: string } | { request: ExportRequest; failed: true }
const formats = { png: "PNG", svg: "SVG", jpg: "JPG" } satisfies Record<ExportFormat, string>
const scopes = { all: "전체", rectangle: "사각형", ellipse: "원형", freehand: "자유형" } satisfies Record<Scope, string>
const maximumQuality = 100
const mib = 1024 ** 2

function QualitySlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Slider className="quality-slider" minValue={1} maxValue={maximumQuality} value={value} onChange={onChange}>
      <Label>{label}</Label>
      <span aria-hidden="true">{value}%</span>
      <SliderTrack className="quality-track">
        <SliderThumb className="quality-thumb" />
      </SliderTrack>
    </Slider>
  )
}

export function ImageExport({ document, region, selectScope, scope, render, close }: Props) {
  const [format, setFormat] = useState<ExportFormat>("png")
  const [margin, setMargin] = useState(0)
  const [quality, setQuality] = useState(maximumQuality)
  const [imageQualities, setImageQualities] = useState<ReadonlyMap<string, number>>(() => new Map())
  const [preview, setPreview] = useState<Preview>()
  const images = useMemo(() => exportImages(document), [document])
  const bounds = useMemo(() => {
    if (scope === "all") return requestBounds(images, margin)
    if (region?.kind === scope) return requestBounds(images, 0, region)
  }, [images, margin, region, scope])
  const request = useMemo<ExportRequest | undefined>(() => {
    if (!bounds || !fitsOutput(bounds)) return undefined
    const theme = getComputedStyle(window.document.documentElement)
    return {
      bounds, region: scope === "all" ? undefined : region, format, quality: quality / maximumQuality,
      images: format === "jpg" ? images.map((image) => ({
        ...image, quality: imageQualities.get(image.id) ?? image.quality,
      })) : images,
      ink: theme.getPropertyValue("--text").trim(),
      paper: theme.getPropertyValue("--surface").trim(),
    }
  }, [bounds, format, imageQualities, images, quality, region, scope])

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    let url: string | undefined
    void render(request, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.blob && result.blob.size <= maximumExportBytes) url = URL.createObjectURL(result.previewBlob ?? result.blob)
      setPreview({ request, result, url })
    }).catch(() => {
      if (!controller.signal.aborted) setPreview({ request, failed: true })
    })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [request, render])

  const current = request && preview?.request === request ? preview : undefined
  const result = current && "result" in current ? current.result : undefined
  const output = result?.blob
  const filename = downloadName(document.project.title, format)
  const tooLarge = output && output.size > maximumExportBytes

  return <section className="image-export" aria-label="이미지 내보내기 설정">
    <Button type="button" onPress={close}>닫기</Button>
    <Choice label="형식" value={format} options={formats} onChange={setFormat} />
    <Choice label="범위" value={scope} options={scopes} onChange={selectScope} />
    {scope === "all" && <NumberField className="export-number" minValue={0} maxValue={maximumExportMargin}
      step={1} value={margin} onChange={(value) => {
        if (Number.isInteger(value)) setMargin(value)
      }}>
      <Label>여백 (px)</Label>
      <Input />
    </NumberField>}
    {format === "jpg" && <>
      <p>JPG는 흰색 배경으로 저장되며 손실 압축을 적용합니다.</p>
      <QualitySlider label="전체 JPG 품질" value={quality} onChange={setQuality} />
      {images.map(({ id, quality }, index) => {
        const percent = Math.round((imageQualities.get(id) ?? quality) * maximumQuality)
        return <QualitySlider key={id} label={`이미지 ${index + 1} 품질`} value={percent} onChange={(value) => {
          setImageQualities((previous) => new Map(previous).set(id, value / maximumQuality))
        }} />
      })}
    </>}
    <p>{filename}</p>
    {bounds && <p>{bounds.width} × {bounds.height}px</p>}
    {!bounds && <p>{scope === "all" ? "내보낼 이미지를 추가해 주세요." : "캔버스에서 내보낼 영역을 그려 주세요."}</p>}
    {bounds && !request && <p role="alert">출력 크기 한도를 넘었습니다. 선택 영역이나 배치를 조정해 주세요.</p>}
    {request && !current && <p role="status">미리보기를 만드는 중입니다.</p>}
    {current && "failed" in current && <p role="alert">이미지를 내보낼 수 없습니다.</p>}
    {result?.clippedMemo && <p role="alert">표시 영역을 넘는 메모는 일부 잘립니다.</p>}
    {output && <p>예상 용량 {(output.size / mib).toFixed(2)} MiB</p>}
    {tooLarge && <p role="alert">64 MiB를 초과했습니다. 영역이나 형식을 조정해 주세요.</p>}
    {current && "url" in current && current.url && <img src={current.url} alt="내보내기 미리보기" />}
    <Button type="button" isDisabled={!output || !!tooLarge} onPress={() => {
      if (output && !tooLarge) downloadBlob(output, filename)
    }}>이미지 저장</Button>
  </section>
}
