"use client"

import { createContext, useContext } from "react"

import type { IndexedDbConnection, IndexedDbMonitor } from "./connection"

export const IndexedDbContext = createContext<
  (IndexedDbConnection & IndexedDbMonitor) | null
>(null)

export function useDatabaseConnection() {
  const connection = useContext(IndexedDbContext)

  if (connection === null) {
    throw new Error("DatabaseProvider is required")
  }

  return connection
}
