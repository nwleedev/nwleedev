import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { CreateProject, ListProjects, Project, ReadProject } from "@/entities/project"

interface Schema extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: string } }
}

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

export function composeProjects(): {
  list: ListProjects
  read: ReadProject
  create: CreateProject
} {
  let connection: Promise<IDBPDatabase<Schema>> | undefined

  function database() {
    connection ??= openDB<Schema>("canvas", 1, {
      upgrade(db) {
        db.createObjectStore("projects", { keyPath: "id" }).createIndex("updatedAt", "updatedAt")
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

  return {
    async list() {
      const db = await database()
      const projects = await db.getAllFromIndex("projects", "updatedAt")
      return projects.map(validateProject).reverse()
    },
    async read(id) {
      const db = await database()
      const project = await db.get("projects", id)
      return project === undefined ? undefined : validateProject(project)
    },
    async create() {
      const project = {
        id: crypto.randomUUID(),
        title: "제목 없는 프로젝트",
        updatedAt: new Date().toISOString(),
        revision: 0,
      }
      const db = await database()
      await db.add("projects", project)
      return project
    },
  }
}
