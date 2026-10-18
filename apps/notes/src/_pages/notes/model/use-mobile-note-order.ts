"use client"

import { useEffect, useRef, useState } from "react"

import { reconcileMobileNoteIds, type Note, type MobileNoteOrder } from "@/entities/note"

import { useNotesData } from "./notes-data-provider"

export function useMobileNoteOrder(notes: readonly Note[]) {
  const { readMobileOrder, moveMobileNote } = useNotesData()
  const [order, setOrder] = useState<MobileNoteOrder | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [readAttempt, setReadAttempt] = useState(0)
  const saving = useRef(false)
  const readVersion = useRef(0)

  useEffect(() => {
    let active = true
    const version = ++readVersion.current
    void readMobileOrder().then((loaded) => {
      if (active && version === readVersion.current) {
        setOrder((current) => current !== null && current.revision > loaded.revision ? current : loaded)
        setFailure(null)
      }
    }).catch(() => {
      if (active && version === readVersion.current) setFailure("메모 순서를 불러오지 못했습니다. 다시 시도하세요.")
    })
    return () => { active = false }
  }, [notes, readAttempt, readMobileOrder])

  const noteIds = reconcileMobileNoteIds(order?.ids ?? [], notes.map(({ id }) => id))
  const notesById = new Map(notes.map((note) => [note.id, note]))
  const orderedNotes = noteIds.flatMap((id) => {
    const note = notesById.get(id)
    return note === undefined ? [] : [note]
  })

  async function move(noteId: string, targetIndex: number) {
    if (order === null || saving.current) return false
    saving.current = true
    readVersion.current += 1
    setPending(true)
    setFailure(null)
    try {
      const result = await moveMobileNote({ expectedRevision: order.revision, noteId, targetIndex })
      setOrder(result.order)
      if (result.status === "conflict") {
        setFailure("다른 탭에서 순서가 바뀌었습니다. 최신 순서를 확인한 뒤 다시 옮기세요.")
        return false
      }
      return true
    } catch {
      setFailure("메모 순서를 저장하지 못했습니다. 다시 옮겨주세요.")
      return false
    } finally {
      saving.current = false
      setPending(false)
    }
  }

  return { failure, move, noteIds, notes: orderedNotes, pending, ready: order !== null, retry: () => setReadAttempt((attempt) => attempt + 1) }
}
