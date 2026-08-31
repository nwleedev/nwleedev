"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import type {
  AccumulatedTextItem,
  AccumulatorRepository,
} from "@/entities/accumulator"
import type { Note } from "@/entities/note"

import type { AccumulationWriter } from "./AccumulationWriter"
import {
  accumulateNote,
  type AccumulateNoteResult,
} from "./accumulateNote"

type AccumulatorState =
  | { items: readonly AccumulatedTextItem[]; status: "ready" }
  | { status: "loading" | "failure" }

export type AccumulationRequest = {
  selectForMobile: boolean
}

type AccumulatorContextValue = AccumulatorState & {
  selectedItemByNote: Readonly<Record<string, string>>
  accumulate(
    note: Note,
    request: AccumulationRequest,
  ): Promise<AccumulateNoteResult>
  retry(): void
}

const AccumulatorContext = createContext<AccumulatorContextValue | null>(null)

async function readAccumulator(
  repository: AccumulatorRepository,
): Promise<AccumulatorState> {
  try {
    const accumulator = await repository.get()
    return {
      items: accumulator?.content.items ?? [],
      status: "ready",
    }
  } catch {
    return { status: "failure" }
  }
}

type AccumulatorProviderProps = PropsWithChildren<{
  createId(): string
  now(): string
  repository: AccumulatorRepository
  writer: AccumulationWriter
}>

export function AccumulatorProvider({
  children,
  createId,
  now,
  repository,
  writer,
}: AccumulatorProviderProps) {
  const [state, setState] = useState<AccumulatorState>({ status: "loading" })
  const [selectedItemByNote, setSelectedItemByNote] = useState<
    Readonly<Record<string, string>>
  >({})
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    void readAccumulator(repository).then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
    }
  }, [repository])

  function retry() {
    setState({ status: "loading" })
    void readAccumulator(repository).then(setState)
  }

  function accumulate(note: Note, request: AccumulationRequest) {
    if (state.status !== "ready") {
      return Promise.resolve<AccumulateNoteResult>({ status: "failure" })
    }

    const operation = queue.current.then(() =>
      accumulateNote({ createId, now, writer }, note),
    )
    queue.current = operation.then(() => undefined)

    return operation.then((result) => {
      if (result.status !== "accumulated") {
        return result
      }

      setState((current) => {
        if (current.status !== "ready") {
          return current
        }

        return {
          items: [...current.items, result.item],
          status: "ready",
        }
      })

      if (request.selectForMobile) {
        setSelectedItemByNote((current) => ({
          ...current,
          [note.id]: result.item.id,
        }))
      }

      return result
    })
  }

  return (
    <AccumulatorContext
      value={{ ...state, accumulate, retry, selectedItemByNote }}
    >
      {children}
    </AccumulatorContext>
  )
}

export function useAccumulator() {
  const context = useContext(AccumulatorContext)

  if (context === null) {
    throw new Error("useAccumulator must be used within AccumulatorProvider")
  }

  return context
}
