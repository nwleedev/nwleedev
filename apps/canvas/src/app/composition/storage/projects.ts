import { openDB, type IDBPDatabase } from "idb"

import type { CreateProject, ListProjects, Project, ReadProject } from "@/entities/project"

import { documentStorage } from "./document"
import type { Schema } from "./schema"

function validateProject(value: unknown): Project {
  if (
    typeof value !== "object" || value === null ||
    !("id" in value) || typeof value.id !== "string" ||
    !("title" in value) || typeof value.title !== "string" ||
    !("updatedAt" in value) || typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
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
    connection ??= openDB<Schema>(name, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("projects", { keyPath: "id" }).createIndex("updatedAt", "updatedAt")
        }

        if (oldVersion < 2) {
          db.createObjectStore("assets", { keyPath: ["projectId", "id"] })
          const placements = db.createObjectStore("placements", { keyPath: "id" })
          placements.createIndex("projectOrder", ["projectId", "zIndex"])
          placements.createIndex("asset", ["projectId", "assetId"])
          db.createObjectStore("memos", { keyPath: "id" }).createIndex("placement", "placementId", { unique: true })
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

  const documents = documentStorage(database, validateProject)

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
      updatedAt: new Date().toISOString(),
      revision: 0,
    }
    const db = await database()
    await db.add("projects", project)
    return project
  }

  async function close() {
    const db = await connection
    db?.close()
    connection = undefined
  }

  return { list, read, create, close, ...documents }
}
