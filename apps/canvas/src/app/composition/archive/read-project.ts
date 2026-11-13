import { BlobReader, BlobWriter, TextWriter, ZipReader } from "@zip.js/zip.js"

import { createMemoText, type ProjectDocument } from "@/entities/project"

import { validateDocument } from "../validate-document"
import { format, manifestName, originalEntry, version } from "./manifest"
import { parseManifest } from "./parse-manifest"

export async function readProjectArchive(file: Blob): Promise<ProjectDocument> {
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = new Map<string, Awaited<ReturnType<typeof reader.getEntries>>[number]>()
    for await (const entry of reader.getEntriesGenerator()) {
      if (entry.directory || entry.encrypted || entries.has(entry.filename)) {
        throw new Error("Invalid archive entry")
      }
      entries.set(entry.filename, entry)
    }
    const header = entries.get(manifestName)
    if (!header || header.directory) throw new Error("Missing manifest")
    const raw: unknown = JSON.parse(await header.getData(new TextWriter(), { checkSignature: true }))
    const manifest = parseManifest(raw, format, version)
    if (entries.size !== manifest.assets.length + 1) throw new Error("Unexpected archive entries")

    const projectId = crypto.randomUUID()
    const assetIds = new Map(manifest.assets.map(({ id }) => [id, crypto.randomUUID()]))
    const placementIds = new Map(manifest.placements.map(({ id }) => [id, crypto.randomUUID()]))
    const assets: ProjectDocument["assets"][number][] = []
    for (const [index, asset] of manifest.assets.entries()) {
      const entry = entries.get(originalEntry(index))
      if (!entry || entry.directory) throw new Error("Missing original image")
      const original = await entry.getData(new BlobWriter(asset.mimeType), { checkSignature: true })
      const url = URL.createObjectURL(original)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        if (image.naturalWidth !== asset.originalWidth || image.naturalHeight !== asset.originalHeight) {
          throw new Error("Image dimensions do not match")
        }
      } finally {
        URL.revokeObjectURL(url)
      }
      assets.push({ ...asset, id: mapped(assetIds, asset.id), projectId, original })
    }
    const placements = manifest.placements.map((placement) => ({
      ...placement, id: mapped(placementIds, placement.id), projectId,
      assetId: mapped(assetIds, placement.assetId),
    }))
    const memoUpdates: ProjectDocument["memoUpdates"][number][] = []
    const memos = manifest.memos.map(({ body, ...memo }) => {
      const id = crypto.randomUUID()
      const text = createMemoText()
      try {
        text.replace(0, 0, body)
        const payload = text.takeUpdate()
        if (payload) memoUpdates.push({ memoId: id, updateId: crypto.randomUUID(), payload })
      } finally {
        text.destroy()
      }
      return { ...memo, id, placementId: mapped(placementIds, memo.placementId) }
    })
    const document = {
      project: { id: projectId, title: manifest.title, updatedAt: Date.now(), revision: 0 },
      assets, placements, memos, memoUpdates,
    }
    validateDocument(document)
    return document
  } finally {
    await reader.close()
  }
}

function mapped(ids: ReadonlyMap<string, string>, id: string) {
  const value = ids.get(id)
  if (!value) throw new Error("Missing archive reference")
  return value
}
