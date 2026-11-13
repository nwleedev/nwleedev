import type { IDBPDatabase, IDBPTransaction } from "idb"

import type { Project, ProjectDocument } from "@/entities/project"

import type { Schema } from "./schema"

const stores = ["projects", "assets", "placements", "memos"] as const

type WriteTransaction = IDBPTransaction<Schema, typeof stores, "readwrite">

function projectRange(id: string) {
  return IDBKeyRange.bound([id], [id, []], false, true)
}

async function deletePlacementRecords(tx: WriteTransaction, placementId: string) {
  const memos = tx.objectStore("memos")
  const memoId = await memos.index("placement").getKey(placementId)
  if (memoId !== undefined) await memos.delete(memoId)
  await tx.objectStore("placements").delete(placementId)
}

async function remove(
  tx: WriteTransaction,
  operation: () => Promise<boolean>,
) {
  const completion = tx.done
  // Observe rejection while individual requests are still pending.
  void completion.catch(() => undefined)
  try {
    const removed = await operation()
    await completion
    return removed
  } catch (error) {
    try {
      tx.abort()
    } catch (abortError) {
      if (!(abortError instanceof DOMException && abortError.name === "InvalidStateError")) {
        throw abortError
      }
    }
    await completion.catch(() => undefined)
    throw error
  }
}

function validateDocument(document: ProjectDocument) {
  const { project, assets, placements, memos } = document
  const originals = new Map(assets.map((asset) => [asset.id, asset]))
  const placementIds = new Set(placements.map(({ id }) => id))

  for (const asset of assets) {
    if (
      asset.projectId !== project.id || !(asset.original instanceof Blob) ||
      !Number.isSafeInteger(asset.originalWidth) || asset.originalWidth <= 0 ||
      !Number.isSafeInteger(asset.originalHeight) || asset.originalHeight <= 0
    ) throw new Error("Invalid project asset")
  }

  for (const placement of placements) {
    const asset = originals.get(placement.assetId)
    if (!asset || placement.projectId !== project.id) throw new Error("Invalid placement reference")
    const { x, y, width, height, zIndex, quality } = placement
    const expectedHeight = (width / asset.originalWidth) * asset.originalHeight
    if (
      ![x, y, width, height].every(Number.isFinite) ||
      width <= 0 || height <= 0 ||
      width > asset.originalWidth || height > asset.originalHeight ||
      Math.abs(height - expectedHeight) > expectedHeight * 1e-9 ||
      !Number.isSafeInteger(zIndex) ||
      !Number.isInteger(quality) || quality < 0 || quality > 100
    ) throw new Error("Invalid placement geometry or quality")
  }

  for (const memo of memos) {
    if (
      !placementIds.has(memo.placementId) ||
      !["top", "right", "bottom", "left"].includes(memo.side) ||
      ![memo.width, memo.height].every(Number.isFinite) ||
      memo.width <= 0 || memo.height <= 0
    ) throw new Error("Invalid memo")
  }
}

export function documentStorage(
  database: () => Promise<IDBPDatabase<Schema>>,
  validateProject: (value: unknown) => Project,
) {
  return {
    async deletePlacement(projectId: string, placementId: string) {
      const db = await database()
      const tx = db.transaction(stores, "readwrite")
      return remove(tx, async () => {
        const projects = tx.objectStore("projects")
        const placements = tx.objectStore("placements")
        const project = await projects.get(projectId)
        const placement = await placements.get(placementId)
        if (!project || placement?.projectId !== projectId) return false

        const assetKey: [string, string] = [projectId, placement.assetId]
        await deletePlacementRecords(tx, placementId)
        if (await placements.index("asset").count(assetKey) === 0) {
          await tx.objectStore("assets").delete(assetKey)
        }
        await projects.put({
          ...validateProject(project),
          updatedAt: new Date().toISOString(),
          revision: project.revision + 1,
        })
        return true
      })
    },

    async deleteDocument(id: string) {
      const db = await database()
      const tx = db.transaction(stores, "readwrite")
      return remove(tx, async () => {
        const projects = tx.objectStore("projects")
        if (await projects.getKey(id) === undefined) return false

        const range = projectRange(id)
        const placements = await tx.objectStore("placements").index("projectOrder").getAllKeys(range)
        for (const placementId of placements) await deletePlacementRecords(tx, placementId)
        await tx.objectStore("assets").delete(range)
        await projects.delete(id)
        return true
      })
    },

    async addDocument(document: ProjectDocument) {
      const { project, assets, placements, memos } = document
      validateProject(project)
      validateDocument(document)
      const db = await database()
      const tx = db.transaction(stores, "readwrite")

      const writes: Promise<unknown>[] = [tx.done]
      try {
        writes.push(tx.objectStore("projects").add(project))
        for (const asset of assets) writes.push(tx.objectStore("assets").add(asset))
        for (const placement of placements) writes.push(tx.objectStore("placements").add(placement))
        for (const memo of memos) writes.push(tx.objectStore("memos").add(memo))
      } catch (error) {
        tx.abort()
        await Promise.allSettled(writes)
        throw error
      }
      await Promise.all(writes)
    },

    async readDocument(id: string): Promise<ProjectDocument | undefined> {
      const db = await database()
      const tx = db.transaction(stores)
      const range = projectRange(id)
      const project = await tx.objectStore("projects").get(id)

      if (!project) {
        await tx.done
        return undefined
      }

      const [assets, placements] = await Promise.all([
        tx.objectStore("assets").getAll(range),
        tx.objectStore("placements").index("projectOrder").getAll(range),
      ])
      const memos = await Promise.all(
        placements.map(({ id: placementId }) => tx.objectStore("memos").index("placement").get(placementId)),
      )
      await tx.done
      const document = { project: validateProject(project), assets, placements, memos: memos.filter((memo) => memo !== undefined) }
      validateDocument(document)
      return document
    },
  }
}
