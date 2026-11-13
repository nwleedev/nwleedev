import type { IDBPDatabase, IDBPTransaction } from "idb"

import { applyPlacementGeometry, resizeMemo, validatePlacementGeometry } from "@/entities/project"
import type { Asset, Memo, MemoUpdate, PlacementGeometry, Project, ProjectChange, ProjectDocument, Size } from "@/entities/project"

import { maximumQuality, memoSides, validateAsset, validateDocument, validateMemoUpdate } from "../validate-document"

import type { Schema } from "./schema"

const stores = ["projects", "assets", "placements", "memos", "memoUpdates"] as const
const initialInset = 24
const insetSteps = 5
const initialMemoHeight = 72
const minimumMemoWidth = 120

type WriteTransaction = IDBPTransaction<Schema, typeof stores, "readwrite">

function keyPrefix(id: string) {
  return IDBKeyRange.bound([id], [id, []], false, true)
}

async function deletePlacementRecords(tx: WriteTransaction, placementId: string) {
  const memos = tx.objectStore("memos")
  const memoId = await memos.index("placement").getKey(placementId)
  if (memoId !== undefined) {
    await tx.objectStore("memoUpdates").delete(keyPrefix(memoId))
    await memos.delete(memoId)
  }
  await tx.objectStore("placements").delete(placementId)
}

async function commitWrite<Result>(
  tx: WriteTransaction,
  operation: () => Promise<Result>,
): Promise<Result> {
  const completion = tx.done
  // Observe rejection while individual requests are still pending.
  void completion.catch(() => undefined)
  try {
    const result = await operation()
    await completion
    return result
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

export function documentStorage(
  database: () => Promise<IDBPDatabase<Schema>>,
  validateProject: (value: unknown) => Project,
  publish: (change: ProjectChange) => void,
) {
  async function commitEdit(
    projectId: string,
    edit: (tx: WriteTransaction) => Promise<boolean>,
    missingProject: "reject" | "skip" = "reject",
  ) {
    const db = await database()
    const tx = db.transaction(stores, "readwrite")
    const committed = await commitWrite(tx, async () => {
      const projects = tx.objectStore("projects")
      const record = await projects.get(projectId)
      if (!record) {
        if (missingProject === "skip") return undefined
        throw new Error("Project no longer exists")
      }
      const project = validateProject(record)
      if (!await edit(tx)) return undefined

      const next = { ...project, updatedAt: Date.now(), revision: project.revision + 1 }
      await projects.put(next)
      return next
    })
    if (committed) publish({ projectId, revision: committed.revision })
    return committed !== undefined
  }

  return {
    async addImage(projectId: string, asset: Asset) {
      validateAsset(asset, projectId)
      const { id, originalWidth, originalHeight } = asset
      await commitEdit(projectId, async (tx) => {
        const placements = tx.objectStore("placements")
        const previous = await placements.index("projectOrder").openCursor(keyPrefix(projectId), "prev")
        const zIndex = previous ? previous.value.zIndex + 1 : 0
        const inset = initialInset + (zIndex % insetSteps) * initialInset
        await tx.objectStore("assets").add(asset)
        await placements.add({
          id, projectId, assetId: id,
          x: inset, y: inset,
          width: originalWidth, height: originalHeight,
          zIndex, quality: maximumQuality,
        })
        return true
      })
    },

    async updatePlacement(projectId: string, placementId: string, change: PlacementGeometry) {
      await commitEdit(projectId, async (tx) => {
        const placements = tx.objectStore("placements")
        const placement = await placements.get(placementId)
        if (placement?.projectId !== projectId) throw new Error("Placement no longer exists")
        const asset = await tx.objectStore("assets").get([projectId, placement.assetId])
        if (!asset) throw new Error("Invalid placement reference")

        const next = applyPlacementGeometry(placement, change)
        validatePlacementGeometry(next, asset)
        await placements.put(next)
        return true
      })
    },

    async addMemo(projectId: string, placementId: string) {
      await commitEdit(projectId, async (tx) => {
        const placement = await tx.objectStore("placements").get(placementId)
        if (placement?.projectId !== projectId) throw new Error("Placement no longer exists")
        const memos = tx.objectStore("memos")
        if (await memos.index("placement").getKey(placementId) !== undefined) return false

        await memos.add({
          id: crypto.randomUUID(),
          placementId,
          side: "bottom",
          width: Math.max(minimumMemoWidth, placement.width),
          height: initialMemoHeight,
        })
        return true
      })
    },

    async updateMemoSide(projectId: string, memoId: string, side: Memo["side"]) {
      if (!memoSides.includes(side)) throw new Error("Invalid memo side")
      await commitEdit(projectId, async (tx) => {
        const memos = tx.objectStore("memos")
        const memo = await memos.get(memoId)
        const placement = memo && await tx.objectStore("placements").get(memo.placementId)
        if (!memo || placement?.projectId !== projectId) throw new Error("Memo no longer exists")
        if (memo.side === side) return false
        await memos.put({ ...memo, side })
        return true
      })
    },

    async updateMemoSize(projectId: string, memoId: string, size: Size) {
      await commitEdit(projectId, async (tx) => {
        const memos = tx.objectStore("memos")
        const memo = await memos.get(memoId)
        if (!memo) throw new Error("Memo no longer exists")
        const placement = await tx.objectStore("placements").get(memo.placementId)
        if (placement?.projectId !== projectId) throw new Error("Memo no longer exists")

        await memos.put(resizeMemo(memo, size))
        return true
      })
    },

    async saveMemoUpdate(projectId: string, update: MemoUpdate) {
      validateMemoUpdate(update)
      await commitEdit(projectId, async (tx) => {
        const memo = await tx.objectStore("memos").get(update.memoId)
        const placement = memo && await tx.objectStore("placements").get(memo.placementId)
        if (placement?.projectId !== projectId) throw new Error("Memo no longer exists")

        const updates = tx.objectStore("memoUpdates")
        if (await updates.getKey([update.memoId, update.updateId]) !== undefined) return false

        await updates.add(update)
        return true
      })
    },

    async deletePlacement(projectId: string, placementId: string) {
      return commitEdit(projectId, async (tx) => {
        const placements = tx.objectStore("placements")
        const placement = await placements.get(placementId)
        if (placement?.projectId !== projectId) return false

        const assetKey: [string, string] = [projectId, placement.assetId]
        await deletePlacementRecords(tx, placementId)
        if (await placements.index("asset").count(assetKey) === 0) {
          await tx.objectStore("assets").delete(assetKey)
        }
        return true
      }, "skip")
    },

    async deleteDocument(id: string) {
      const db = await database()
      const tx = db.transaction(stores, "readwrite")
      return commitWrite(tx, async () => {
        const projects = tx.objectStore("projects")
        if (await projects.getKey(id) === undefined) return false

        const range = keyPrefix(id)
        const placements = await tx.objectStore("placements").index("projectOrder").getAllKeys(range)
        for (const placementId of placements) await deletePlacementRecords(tx, placementId)
        await tx.objectStore("assets").delete(range)
        await projects.delete(id)
        return true
      })
    },

    async addDocument(document: Omit<ProjectDocument, "memoUpdates"> & { memoUpdates?: readonly MemoUpdate[] }) {
      const { project, assets, placements, memos } = document
      const memoUpdates = document.memoUpdates ?? []
      validateProject(project)
      validateDocument({ ...document, memoUpdates })
      const db = await database()
      const tx = db.transaction(stores, "readwrite")

      await commitWrite(tx, async () => {
        await tx.objectStore("projects").add(project)
        for (const asset of assets) await tx.objectStore("assets").add(asset)
        for (const placement of placements) await tx.objectStore("placements").add(placement)
        for (const memo of memos) await tx.objectStore("memos").add(memo)
        for (const update of memoUpdates) await tx.objectStore("memoUpdates").add(update)
      })
    },

    async readDocument(id: string): Promise<ProjectDocument | undefined> {
      const db = await database()
      const tx = db.transaction(stores)
      const range = keyPrefix(id)
      const project = await tx.objectStore("projects").get(id)

      if (!project) {
        await tx.done
        return undefined
      }

      const [assets, placements] = await Promise.all([
        tx.objectStore("assets").getAll(range),
        tx.objectStore("placements").index("projectOrder").getAll(range),
      ])
      const records = await Promise.all(
        placements.map(({ id: placementId }) => tx.objectStore("memos").index("placement").get(placementId)),
      )
      const memos = records.filter((memo) => memo !== undefined)
      const updates = tx.objectStore("memoUpdates")
      const changes = await Promise.all(memos.map(({ id: memoId }) => updates.getAll(keyPrefix(memoId))))
      const memoUpdates = changes.flat()
      await tx.done
      const document = { project: validateProject(project), assets, placements, memos, memoUpdates }
      validateDocument(document)
      return document
    },
  }
}
