import { openDB, type IDBPDatabase } from "idb"

import type { CreateProject, ListProjects, Project, ReadProject } from "@/entities/project"

import { projectChanges } from "./changes"
import { documentStorage } from "./document"
import type { Schema } from "./schema"

const databaseVersion = 4
const documentStoresVersion = 2
const timestampVersion = 3
const memoUpdatesVersion = 4

function validateProject(value: unknown): Project {
  if (
    typeof value !== "object" || value === null ||
    !("id" in value) || typeof value.id !== "string" ||
    !("title" in value) || typeof value.title !== "string" ||
    !("updatedAt" in value) || typeof value.updatedAt !== "number" ||
    !Number.isFinite(new Date(value.updatedAt).getTime()) ||
    !("revision" in value) || typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) || value.revision < 0
  ) {
    throw new Error("Invalid project record")
  }

  return {
    id: value.id,
    title: value.title,
    updatedAt: value.updatedAt,
    revision: value.revision,
  }
}

export function composeProjects(name = "canvas") {
  let connection: Promise<IDBPDatabase<Schema>> | undefined

  function database() {
    connection ??= openDB<Schema>(name, databaseVersion, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("projects", { keyPath: "id" }).createIndex("updatedAt", "updatedAt")
        }

        if (oldVersion < documentStoresVersion) {
          db.createObjectStore("assets", { keyPath: ["projectId", "id"] })
          const placements = db.createObjectStore("placements", { keyPath: "id" })
          placements.createIndex("projectOrder", ["projectId", "zIndex"])
          placements.createIndex("asset", ["projectId", "assetId"])
          db.createObjectStore("memos", { keyPath: "id" }).createIndex("placement", "placementId", { unique: true })
        }
        if (oldVersion < memoUpdatesVersion) {
          db.createObjectStore("memoUpdates", { keyPath: ["memoId", "updateId"] })
        }
        if (oldVersion > 0 && oldVersion < timestampVersion) {
          try {
            const projects = transaction.objectStore("projects")
            let cursor = await projects.openCursor()
            while (cursor) {
              const updatedAt: unknown = cursor.value.updatedAt
              if (typeof updatedAt !== "string") throw new Error("Invalid legacy timestamp")
              await cursor.update(validateProject({ ...cursor.value, updatedAt: Date.parse(updatedAt) }))
              cursor = await cursor.continue()
            }
          } catch {
            try {
              transaction.abort()
            } catch (error) {
              if (!(error instanceof DOMException && error.name === "InvalidStateError")) throw error
            }
          }
        }
      },
      blocking(_current, _next, event) {
        if (event.target instanceof IDBDatabase) event.target.close()
        connection = undefined
      },
      terminated() {
        connection = undefined
      },
    }).catch((error: unknown) => {
      connection = undefined
      throw error
    })
    return connection
  }

  const changes = projectChanges(name)
  const documents = documentStorage(database, validateProject, changes.publish)

  const list: ListProjects = async () => {
    const db = await database()
    const projects = await db.getAllFromIndex("projects", "updatedAt")
    return projects.map(validateProject).reverse()
  }
  const read: ReadProject = async (id) => {
    const db = await database()
    const project = await db.get("projects", id)
    return project === undefined ? undefined : validateProject(project)
  }
  const create: CreateProject = async () => {
    const project = {
      id: crypto.randomUUID(),
      title: "제목 없는 프로젝트",
      updatedAt: Date.now(),
      revision: 0,
    }
    const db = await database()
    await db.add("projects", project)
    return project
  }

  async function close() {
    changes.close()
    const db = await connection
    db?.close()
    connection = undefined
  }

  return { list, read, create, close, subscribe: changes.subscribe, ...documents }
}
