import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js"

import type { ProjectDocument } from "@/entities/project"

import { buildManifest, manifestName, originalEntry } from "./manifest"

const storeWithoutCompression = 0

export async function writeProject(document: ProjectDocument) {
  const manifest = buildManifest(document)
  const writer = new ZipWriter(new BlobWriter("application/zip"))
  try {
    await writer.add(manifestName, new TextReader(JSON.stringify(manifest)))
    for (const [index, asset] of document.assets.entries()) {
      await writer.add(originalEntry(index), new BlobReader(asset.original), {
        level: storeWithoutCompression,
      })
    }
  } catch (error) {
    await writer.close().catch(() => undefined)
    throw error
  }
  return writer.close()
}
