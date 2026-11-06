"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"

import { type Note, type MobileNoteOrder } from "@/entities/note"

import { usePointerReorder } from "@/shared/lib/pointer-reorder"

import { useNotesData } from "./notes-data-provider"

const orderChannelName = "personal-notes-mobile-order"
const readFailure = "메모 순서를 불러오지 못했습니다. 다시 시도하세요."

export function useMobileNoteOrder(notes: readonly Note[]) {
  const { readMobileOrder, moveMobileNote } = useNotesData()
  const [order, setOrder] = useState<MobileNoteOrder | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [readAttempt, setReadAttempt] = useState(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const deferredRead = useRef(false)
  const saving = useRef(false)
  const readVersion = useRef(0)

  useEffect(() => {
    let active = true
    const version = ++readVersion.current
    void readMobileOrder().then((loaded) => {
      if (active && version === readVersion.current) {
        setOrder(loaded)
        setFailure((current) => current === readFailure ? null : current)
      }
    }).catch(() => {
      if (active && version === readVersion.current) setFailure(readFailure)
    })
    return () => { active = false }
  }, [notes, readAttempt, readMobileOrder])

  const notesById = new Map(notes.map((note) => [note.id, note]))
  const known = new Set(order?.ids)
  const added = notes.filter(({ id }) => !known.has(id)).map(({ id }) => id).reverse()
  const noteIds = [...added, ...[...known].filter((id) => notesById.has(id))]
  const orderedNotes = noteIds.flatMap((id) => {
    const note = notesById.get(id)
    return note === undefined ? [] : [note]
  })

  async function move(noteId: string, targetIndex: number, visibleIds: readonly string[]) {
    if (order === null || saving.current) return false
    saving.current = true
    readVersion.current += 1
    setPending(true)
    setFailure(null)
    try {
      const result = await moveMobileNote({ visibleIds, noteId, targetIndex })
      setOrder(result.order)
      if (result.status === "conflict") {
        setFailure("다른 탭에서 순서가 바뀌었습니다. 최신 순서를 확인한 뒤 다시 옮기세요.")
        return false
      }
      channel.current?.postMessage("moved")
      return true
    } catch {
      setFailure("메모 순서를 저장하지 못했습니다. 다시 옮겨주세요.")
      return false
    } finally {
      saving.current = false
      setPending(false)
    }
  }

  const reorder = usePointerReorder({
    allowAddedItems: true,
    disabled: pending || !order,
    items: orderedNotes,
    onMove: move,
  })
  const dragging = reorder.drag !== null
  const receiveMove = useEffectEvent(() => {
    if (dragging || saving.current) deferredRead.current = true
    else setReadAttempt((attempt) => attempt + 1)
  })

  useEffect(() => {
    const updates = new BroadcastChannel(orderChannelName)
    channel.current = updates
    updates.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (data === "moved") receiveMove()
    }
    return () => {
      channel.current = null
      updates.close()
    }
  }, [])

  useEffect(() => {
    if (dragging || pending || !deferredRead.current) return
    deferredRead.current = false
    setReadAttempt((attempt) => attempt + 1)
  }, [dragging, pending])

  return { failure, reorder, noteIds, notes: orderedNotes, pending, ready: order !== null, retry() { setFailure(null); setReadAttempt((attempt) => attempt + 1) } }
}
