import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js"

import type { ProjectDocument } from "@/entities/project"

import { checkExtractedSize, checkOriginals, checkZipSize } from "./limits"
import { buildManifest, manifestName, originalEntry } from "./manifest"

const storeWithoutCompression = 0

export async function writeProject(document: ProjectDocument) {
  checkOriginals(document.assets)
  const manifestText = JSON.stringify(buildManifest(document))
  const extractedBytes = document.assets.reduce((total, { original }) => total + original.size, new TextEncoder().encode(manifestText).byteLength)
  checkExtractedSize(extractedBytes)
  const writer = new ZipWriter(new BlobWriter("application/zip"))
  try {
    await writer.add(manifestName, new TextReader(manifestText))
    for (const [index, asset] of document.assets.entries()) {
      await writer.add(originalEntry(index), new BlobReader(asset.original), {
        level: storeWithoutCompression,
      })
    }
  } catch (error) {
    await writer.close().catch(() => undefined)
    throw error
  }
  const zip = await writer.close()
  checkZipSize(zip.size)
  return zip
}
