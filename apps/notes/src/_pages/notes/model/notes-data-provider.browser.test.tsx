import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useForm } from "react-hook-form"
import * as fc from "fast-check"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { page, userEvent } from "vitest/browser"

import type { Note, NoteRepository } from "@/entities/note"
import type { NoteDraftRepository } from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import {
  createExplorationActionCounts,
  createExplorationReport,
  ExplorationInvariantError,
  recordExplorationActionCheck,
  recordExplorationActionExecution,
  type ExplorationActionCounts,
  type ExplorationPhase,
} from "@/shared/lib/note-model-exploration"
import {
  noteModelProfile,
  noteModelSettings,
} from "@/shared/lib/note-model-settings"

import type {
  NoteStorageEvent,
  NoteStorageMonitor,
} from "./note-storage-monitor"
import {
  NotesDataProvider,
  useNotesData,
} from "./notes-data-provider"
import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteContentAutosave } from "./use-note-content-autosave"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const timestamp = "2026-08-31T01:00:00.000Z"
const clipboard = {
  writeText: async () => ({ status: "written" }) as const,
}
const usage: IndividualCopyUsageWriter = {
  recordIndividualCopy: async () => undefined,
}
const drafts: NoteDraftRepository = {
  get: async () => null,
  remove: async () => undefined,
  save: async (draft) => draft,
}

declare const __NOTES_GIT_REVISION__: string

type AutosaveEditorProps = {
  initialContent: string
  note: Note
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
}

function AutosaveEditor({
  initialContent,
  note,
  onSave,
}: AutosaveEditorProps) {
  const { getValues, register, reset } = useForm<{ content: string }>({
    defaultValues: { content: initialContent },
  })

  function readContent() {
    return getValues("content")
  }

  function acceptSavedContent(savedContent: string) {
    if (readContent() === savedContent) {
      reset({ content: savedContent })
    }
  }

  const content = useNoteContentAutosave({
    initialContent,
    note,
    onContentSaved: acceptSavedContent,
    onFailure: () => undefined,
    onSave,
    readContent,
  })
  const contentRegistration = register("content", {
    onBlur() {
      void content.save()
    },
    onChange() {
      content.scheduleSave()
    },
  })

  return (
    <textarea
      aria-label="메모 내용"
      {...contentRegistration}
    />
  )
}

function NotesDataProbe() {
  const notesData = useNotesData()

  if (notesData.status === "loading") {
    return <p>메모 불러오는 중</p>
  }

  if (notesData.status === "blocked") {
    return (
      <>
        <p>다른 탭을 닫고 다시 시도하세요.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  if (notesData.status === "version-changed") {
    return (
      <>
        <p>다른 탭에서 변경되었습니다. 다시 불러오세요.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  if (notesData.status === "failure") {
    return (
      <>
        <p>메모를 불러오지 못했습니다.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  const firstNote = notesData.notes[0]

  return (
    <>
      <button
        onClick={() => {
          void notesData.createNote()
        }}
        type="button"
      >
        새 메모
      </button>
      {notesData.status === "empty" ? <p>메모가 없습니다.</p> : null}
      {notesData.notes.map((note) => (
        <article key={note.id}>{note.content}</article>
      ))}
      {firstNote ? (
        <AutosaveEditor
          initialContent={
            notesData.draftContentByNote[firstNote.id] ?? firstNote.content
          }
          note={firstNote}
          onSave={notesData.saveContent}
        />
      ) : null}
    </>
  )
}

type CreationDefect = "drop-second-save" | "none"

type CreationModel = {
  created: number
}

type CreationReal = {
  create(): Promise<void>
  inspect(): Promise<void>
  reload(): Promise<void>
}

class CreateNoteCommand implements fc.AsyncCommand<CreationModel, CreationReal> {
  constructor(
    private readonly counts: ExplorationActionCounts,
    private readonly phase: () => ExplorationPhase,
  ) {}

  check() {
    recordExplorationActionCheck(this.counts, this.phase(), true)
    return true
  }

  async run(model: CreationModel, real: CreationReal) {
    recordExplorationActionExecution(this.counts, this.phase())
    await real.create()
    model.created += 1
  }

  toString() {
    return "create"
  }
}

class InspectCreatedNotesCommand implements fc.AsyncCommand<CreationModel, CreationReal> {
  constructor(
    private readonly counts: ExplorationActionCounts,
    private readonly phase: () => ExplorationPhase,
  ) {}

  check() {
    recordExplorationActionCheck(this.counts, this.phase(), true)
    return true
  }

  async run(_model: CreationModel, real: CreationReal) {
    recordExplorationActionExecution(this.counts, this.phase())
    await real.inspect()
  }

  toString() {
    return "inspect"
  }
}

class ReloadCreatedNotesCommand implements fc.AsyncCommand<CreationModel, CreationReal> {
  constructor(
    private readonly counts: ExplorationActionCounts,
    private readonly phase: () => ExplorationPhase,
  ) {}

  check(model: Readonly<CreationModel>) {
    const accepted = model.created > 1
    recordExplorationActionCheck(this.counts, this.phase(), accepted)
    return accepted
  }

  async run(model: CreationModel, real: CreationReal) {
    recordExplorationActionExecution(this.counts, this.phase())
    await real.reload()
    await real.inspect()

    const visibleNotes = await page.getByRole("article").all()
    if (visibleNotes.length !== model.created) {
      throw new ExplorationInvariantError(
        "created-notes-survive-reload",
        { count: model.created },
        { count: visibleNotes.length },
      )
    }
  }

  toString() {
    return "reload"
  }
}

function createCreationRepository(defect: CreationDefect) {
  const stored: Note[] = []
  let saveCount = 0

  const repository: NoteRepository = {
    getAll: async () => stored.map((note) => ({ ...note })),
    remove: async () => undefined,
    async save(note) {
      saveCount += 1
      if (defect !== "drop-second-save" || saveCount !== 2) {
        stored.push(note)
      }
      return note
    },
    saveAll: async (notes) => notes,
  }

  return repository
}

async function executeCreationCommands(
  commands: Iterable<fc.AsyncCommand<CreationModel, CreationReal>>,
  defect: CreationDefect,
) {
  const container = document.createElement("div")
  document.body.append(container)
  const repository = createCreationRepository(defect)
  const storage = createStorageMonitor()
  let idSequence = 0
  let candidateRoot = createRoot(container)

  async function renderCandidate() {
    await act(async () => {
      candidateRoot.render(
        <NotesDataProvider
          batchCopyShortcutEnabled
          clipboard={clipboard}
          createId={() => `created-note-${++idSequence}`}
          drafts={drafts}
          now={() => timestamp}
          repository={repository}
          storageMonitor={storage.monitor}
          usage={usage}
        >
          <NotesDataProbe />
        </NotesDataProvider>,
      )
    })
    await expect
      .element(page.getByRole("button", { name: "새 메모" }))
      .toBeEnabled()
  }

  const real: CreationReal = {
    async create() {
      const before = await page.getByRole("article").all()
      await act(async () => {
        await userEvent.click(page.getByRole("button", { name: "새 메모" }))
      })
      const after = await page.getByRole("article").all()
      expect(after).toHaveLength(before.length + 1)
    },
    async inspect() {
      await expect
        .element(page.getByRole("button", { name: "새 메모" }))
        .toBeEnabled()
    },
    async reload() {
      await act(async () => candidateRoot.unmount())
      candidateRoot = createRoot(container)
      await renderCandidate()
    },
  }

  try {
    await renderCandidate()
    await fc.asyncModelRun(
      () => ({ model: { created: 0 }, real }),
      commands,
    )
  } finally {
    await act(async () => candidateRoot.unmount())
    container.remove()
  }
}

async function checkCreationExploration(defect: CreationDefect) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const commands = [
    fc.constant(new CreateNoteCommand(counts, () => phase)),
    fc.constant(new InspectCreatedNotesCommand(counts, () => phase)),
    fc.constant(new ReloadCreatedNotesCommand(counts, () => phase)),
  ]
  const property = fc.asyncProperty(
    fc.commands(commands, { maxCommands: 10 }),
    async (generatedCommands) => {
      try {
        await executeCreationCommands(generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = performance.now()
  const details = await fc.check(property, {
    endOnFailure: false,
    interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
    markInterruptAsFailure: true,
    numRuns: Math.min(noteModelSettings.numRuns, 20),
    seed: 1,
    verbose: true,
  })

  return {
    commands,
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

type AutosaveDefect = "drop-save" | "none"

type AutosaveModel = {
  elapsedSinceInput: number
  input: string
  observationPending: boolean
  saved: string
}

type AutosaveReal = {
  advance(milliseconds: number): Promise<void>
  edit(content: string): Promise<void>
  inspect(expectedContent: string): void
  saveNow(trigger: "blur" | "hidden" | "pagehide"): Promise<void>
}

abstract class AutosaveCommand implements fc.AsyncCommand<AutosaveModel, AutosaveReal> {
  constructor(
    protected readonly counts: ExplorationActionCounts,
    protected readonly phase: () => ExplorationPhase,
  ) {}

  check(_model: Readonly<AutosaveModel>) {
    recordExplorationActionCheck(this.counts, this.phase(), true)
    return true
  }

  protected recordExecution() {
    recordExplorationActionExecution(this.counts, this.phase())
  }

  abstract run(model: AutosaveModel, real: AutosaveReal): Promise<void>
  abstract toString(): string
}

class EditAutosaveCommand extends AutosaveCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly label: string,
    private readonly content: string,
  ) {
    super(counts, phase)
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    this.recordExecution()
    model.input = this.content
    model.elapsedSinceInput = 0
    await real.edit(this.content)
  }

  toString() {
    return this.label
  }
}

class AdvanceAutosaveCommand extends AutosaveCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly milliseconds: number,
  ) {
    super(counts, phase)
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    this.recordExecution()
    if (model.input !== model.saved) {
      model.elapsedSinceInput += this.milliseconds
      if (model.elapsedSinceInput >= 800) {
        model.saved = model.input
        model.elapsedSinceInput = 0
        model.observationPending = true
      }
    }
    await real.advance(this.milliseconds)
  }

  toString() {
    return `advance(${this.milliseconds})`
  }
}

class SaveAutosaveNowCommand extends AutosaveCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly trigger: "blur" | "hidden" | "pagehide",
  ) {
    super(counts, phase)
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    this.recordExecution()
    if (model.input !== model.saved) {
      model.saved = model.input
      model.elapsedSinceInput = 0
      model.observationPending = true
    }
    await real.saveNow(this.trigger)
  }

  toString() {
    return this.trigger
  }
}

class InspectAutosaveCommand extends AutosaveCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<AutosaveModel>) {
    const accepted = model.observationPending
    recordExplorationActionCheck(this.counts, this.phase(), accepted)
    return accepted
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    this.recordExecution()
    real.inspect(model.saved)
    model.observationPending = false
  }

  toString() {
    return "inspect-saved"
  }
}

function createAutosaveRepository(defect: AutosaveDefect) {
  let stored = createNote("note-autosave-model", "저장된 메모")
  const repository: NoteRepository = {
    getAll: async () => [{ ...stored }],
    remove: async () => undefined,
    async save(note) {
      if (defect !== "drop-save") {
        stored = note
      }
      return note
    },
    saveAll: async (notes) => notes,
  }

  return { read: () => stored, repository }
}

async function executeAutosaveCommands(
  commands: Iterable<fc.AsyncCommand<AutosaveModel, AutosaveReal>>,
  defect: AutosaveDefect,
) {
  const container = document.createElement("div")
  document.body.append(container)
  const candidateRoot = createRoot(container)
  const autosave = createAutosaveRepository(defect)
  const storage = createStorageMonitor()

  await act(async () => {
    candidateRoot.render(
      <NotesDataProvider
        batchCopyShortcutEnabled
        clipboard={clipboard}
        createId={() => "unused-note"}
        drafts={drafts}
        now={() => timestamp}
        repository={autosave.repository}
        storageMonitor={storage.monitor}
        usage={usage}
      >
        <NotesDataProbe />
      </NotesDataProvider>,
    )
  })
  await expect
    .element(page.getByRole("textbox", { name: "메모 내용" }))
    .toHaveValue("저장된 메모")

  const real: AutosaveReal = {
    async advance(milliseconds) {
      await act(async () => vi.advanceTimersByTimeAsync(milliseconds))
    },
    async edit(content) {
      await act(async () => {
        await userEvent.fill(
          page.getByRole("textbox", { name: "메모 내용" }),
          content,
        )
      })
    },
    inspect(expectedContent) {
      const observed = { content: autosave.read().content }
      const expected = { content: expectedContent }
      if (observed.content !== expected.content) {
        throw new ExplorationInvariantError(
          "autosave-persists-latest-input",
          expected,
          observed,
        )
      }
    },
    async saveNow(trigger) {
      await act(async () => {
        if (trigger === "blur") {
          await userEvent.tab()
          return
        }
        if (trigger === "pagehide") {
          window.dispatchEvent(new Event("pagehide"))
          await Promise.resolve()
          return
        }

        const visibilityDescriptor = Object.getOwnPropertyDescriptor(
          document,
          "visibilityState",
        )
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        })
        document.dispatchEvent(new Event("visibilitychange"))
        await Promise.resolve()
        if (visibilityDescriptor !== undefined) {
          Object.defineProperty(
            document,
            "visibilityState",
            visibilityDescriptor,
          )
        } else {
          Reflect.deleteProperty(document, "visibilityState")
        }
      })
    },
  }

  try {
    await fc.asyncModelRun(
      () => ({
        model: {
          elapsedSinceInput: 0,
          input: "저장된 메모",
          observationPending: false,
          saved: "저장된 메모",
        },
        real,
      }),
      commands,
    )
  } finally {
    await act(async () => candidateRoot.unmount())
    vi.clearAllTimers()
    container.remove()
  }
}

function checkAutosaveExploration(
  defect: AutosaveDefect,
  timerOnly: boolean,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const editCommands = [
    fc.constant(
      new EditAutosaveCommand(counts, currentPhase, "edit-a", "입력 A"),
    ),
    fc.constant(
      new EditAutosaveCommand(counts, currentPhase, "edit-b", "입력 B"),
    ),
  ]
  const timerCommands = [
    ...editCommands,
    fc.constant(new AdvanceAutosaveCommand(counts, currentPhase, 799)),
    fc.constant(new AdvanceAutosaveCommand(counts, currentPhase, 1)),
    fc.constant(new AdvanceAutosaveCommand(counts, currentPhase, 800)),
    fc.constant(new InspectAutosaveCommand(counts, currentPhase)),
  ]
  const commands = timerOnly
    ? timerCommands
    : [
        ...timerCommands,
        fc.constant(new SaveAutosaveNowCommand(counts, currentPhase, "blur")),
        fc.constant(new SaveAutosaveNowCommand(counts, currentPhase, "hidden")),
        fc.constant(new SaveAutosaveNowCommand(counts, currentPhase, "pagehide")),
      ]
  const property = fc.asyncProperty(
    fc.commands(commands, { maxCommands: 12 }),
    async (generatedCommands) => {
      try {
        await executeAutosaveCommands(generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = vi.getRealSystemTime()
  return fc
    .check(property, {
      interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
      markInterruptAsFailure: true,
      numRuns: Math.min(noteModelSettings.numRuns, 20),
      seed: 3,
      verbose: true,
    })
    .then((details) => ({
      commands,
      counts,
      details,
      durationMs: vi.getRealSystemTime() - startedAt,
    }))
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })

  return { promise, resolve }
}

function createNote(id: string, content: string): Note {
  return {
    content,
    contentRevision: 0,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 20, y: 20, zIndex: 1 },
    id,
    revision: 0,
    tabIndex: 1000,
    updatedAt: timestamp,
  }
}

function createRepository(
  reads: readonly Promise<readonly Note[]>[],
): NoteRepository {
  let nextRead = 0

  return {
    getAll() {
      const read = reads[nextRead]
      nextRead += 1

      return read ?? Promise.reject(new Error("Unexpected note read"))
    },
    remove: async () => undefined,
    save: async (note) => note,
    saveAll: async (notes) => notes,
  }
}

function createDelayedSaveRepository(note: Note) {
  const firstSaveStarted = createDeferred<void>()
  const releaseFirstSave = createDeferred<void>()
  const secondSaveStarted = createDeferred<void>()
  const releaseSecondSave = createDeferred<void>()
  const secondSaveFinished = createDeferred<void>()
  let currentNote = note
  let saveCount = 0

  const repository: NoteRepository = {
    getAll: async () => [currentNote],
    remove: async () => undefined,
    async save(nextNote) {
      saveCount += 1

      if (saveCount === 1) {
        firstSaveStarted.resolve()
        await releaseFirstSave.promise
      }

      if (saveCount === 2) {
        secondSaveStarted.resolve()
        await releaseSecondSave.promise
      }

      currentNote = nextNote

      if (saveCount === 2) {
        secondSaveFinished.resolve()
      }

      return nextNote
    },
    saveAll: async (notes) => notes,
  }

  return {
    completeFirstSave: () => releaseFirstSave.resolve(),
    completeSecondSave: () => releaseSecondSave.resolve(),
    repository,
    secondSaveFinished: secondSaveFinished.promise,
    secondSaveStarted: secondSaveStarted.promise,
    firstSaveStarted: firstSaveStarted.promise,
  }
}

function createStorageMonitor() {
  let listener: ((event: NoteStorageEvent) => void) | null = null
  const monitor: NoteStorageMonitor = {
    subscribe(nextListener) {
      listener = nextListener

      return () => {
        if (listener === nextListener) {
          listener = null
        }
      }
    },
  }

  return {
    emit(event: NoteStorageEvent) {
      if (listener === null) {
        throw new Error("Storage monitor has no subscriber")
      }

      listener(event)
    },
    monitor,
  }
}

describe("NotesDataProvider", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  async function renderNotes(
    repository: NoteRepository,
    storageMonitor: NoteStorageMonitor,
  ) {
    await act(async () => {
      root.render(
        <NotesDataProvider
          batchCopyShortcutEnabled
          clipboard={clipboard}
          createId={() => "created-note"}
          drafts={drafts}
          now={() => timestamp}
          repository={repository}
          storageMonitor={storageMonitor}
          usage={usage}
        >
          <NotesDataProbe />
        </NotesDataProvider>,
      )
    })
  }

  it("keeps waiting after an upgrade is blocked and recovers when it continues", async () => {
    const initialRead = createDeferred<readonly Note[]>()
    const storage = createStorageMonitor()
    await renderNotes(createRepository([initialRead.promise]), storage.monitor)
    await expect
      .element(page.getByText("메모 불러오는 중"))
      .toBeInTheDocument()

    await act(async () => storage.emit("blocked"))
    await expect
      .element(page.getByText("다른 탭을 닫고 다시 시도하세요."))
      .toBeInTheDocument()
    await expect
      .element(page.getByRole("button", { name: "다시 시도" }))
      .toBeEnabled()

    await act(async () => {
      initialRead.resolve([])
      await initialRead.promise
    })
    await expect
      .element(page.getByText("메모가 없습니다."))
      .toBeInTheDocument()
  })

  it("keeps the retried result when an earlier read finishes later", async () => {
    const initialRead = createDeferred<readonly Note[]>()
    const retriedRead = createDeferred<readonly Note[]>()
    const storage = createStorageMonitor()
    const latestNote = createNote("note-latest", "다시 불러온 메모")
    const staleNote = createNote("note-stale", "이전에 요청한 메모")
    await renderNotes(
      createRepository([initialRead.promise, retriedRead.promise]),
      storage.monitor,
    )

    await act(async () => storage.emit("version-changed"))
    const retry = page.getByRole("button", { name: "다시 시도" })
    await expect.element(retry).toBeEnabled()
    await act(async () => userEvent.click(retry))

    await act(async () => {
      retriedRead.resolve([latestNote])
      await retriedRead.promise
    })
    const notePreview = page.getByRole("article").first()
    await expect.element(notePreview).toHaveTextContent(latestNote.content)

    await act(async () => {
      initialRead.resolve([staleNote])
      await initialRead.promise
    })
    await expect.element(notePreview).toHaveTextContent(latestNote.content)
    await expect.element(notePreview).not.toHaveTextContent(staleNote.content)
  })

  it("blur saves the latest text immediately after an earlier save finishes", async () => {
    const storage = createStorageMonitor()
    const delayed = createDelayedSaveRepository(
      createNote("note-autosave", "저장된 메모"),
    )
    await renderNotes(delayed.repository, storage.monitor)
    const editor = page.getByRole("textbox", { name: "메모 내용" })

    await act(async () => {
      await userEvent.fill(editor, "먼저 저장할 메모")
      await userEvent.tab()
    })
    await delayed.firstSaveStarted

    await act(async () => {
      await userEvent.fill(editor, "저장 중에 완성한 메모")
      await userEvent.tab()
    })
    await act(async () => {
      delayed.completeFirstSave()
      await delayed.secondSaveStarted
    })
    await act(async () => {
      delayed.completeSecondSave()
      await delayed.secondSaveFinished
    })

    await expect
      .element(page.getByRole("article").first())
      .toHaveTextContent("저장 중에 완성한 메모")
  })

  it("shrinks a generated timer save failure and replays the latest input", async () => {
    vi.useFakeTimers()

    try {
      const normal = await checkAutosaveExploration("none", false)
      expect(normal.details.failed).toBe(false)
      expect(normal.details.interrupted).toBe(false)
      console.info(
        JSON.stringify({
          actionCounts: normal.counts,
          appRevision: __NOTES_GIT_REVISION__,
          classification: "normal",
          durationMs: normal.durationMs,
          environment: "vitest-browser",
          feature: "note-autosave",
          layer: "use-note-content-autosave",
          modelRevision: "autosave-v1",
          profile: noteModelProfile,
          runs: normal.details.numRuns,
          seed: normal.details.seed,
          termination: "completed",
          toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
        }),
      )

      const faulty = await checkAutosaveExploration("drop-save", true)
      expect(faulty.details.failed).toBe(true)
      expect(faulty.details.interrupted).toBe(false)

      const report = createExplorationReport(faulty.details, {
        actionCounts: faulty.counts,
        appRevision: __NOTES_GIT_REVISION__,
        classification: "controlled-defect",
        durationMs: faulty.durationMs,
        environment: "vitest-browser",
        feature: "note-autosave",
        initialState: {
          elapsedSinceInput: 0,
          input: "저장된 메모",
          saved: "저장된 메모",
        },
        layer: "use-note-content-autosave",
        modelRevision: "autosave-v1",
        profile: noteModelProfile,
        toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
      })

      expect(report.invariant).toBe("autosave-persists-latest-input")
      expect(report.originalActions.length).toBeGreaterThan(
        report.minimalActions.length,
      )
      expect(report.minimalActions).toEqual([
        "edit-a",
        "advance(800)",
        "inspect-saved",
      ])
      expect(report.replayPath).not.toBeNull()
      expect(normal.counts.exploration.executed).toBeGreaterThan(0)
      expect(normal.counts.exploration.rejected).toBeGreaterThan(0)

      const replay = await fc.check(
        fc.asyncProperty(
          fc.commands(faulty.commands, {
            maxCommands: 12,
            replayPath: report.replayPath ?? undefined,
          }),
          async (generatedCommands) => {
            await executeAutosaveCommands(generatedCommands, "drop-save")
          },
        ),
        {
          endOnFailure: true,
          numRuns: 1,
          path: report.path,
          seed: report.seed,
        },
      )
      expect(replay.failed).toBe(true)
      expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)

      const directCounts = createExplorationActionCounts()
      const directPhase = () => "exploration" as const
      const directCommands = [
        new EditAutosaveCommand(
          directCounts,
          directPhase,
          "edit-a",
          "입력 A",
        ),
        new AdvanceAutosaveCommand(directCounts, directPhase, 800),
        new InspectAutosaveCommand(directCounts, directPhase),
      ]
      await expect(
        executeAutosaveCommands(directCommands, "drop-save"),
      ).rejects.toMatchObject({ invariant: report.invariant })
      await expect(
        executeAutosaveCommands(directCommands, "none"),
      ).resolves.toBeUndefined()

      console.info(JSON.stringify(report))
    } finally {
      vi.useRealTimers()
    }
  })

  it("shrinks a generated creation sequence and replays a dropped save", async () => {
    const normal = await checkCreationExploration("none")
    expect(normal.details.failed).toBe(false)
    expect(normal.details.interrupted).toBe(false)

    const faulty = await checkCreationExploration("drop-second-save")
    expect(faulty.details.failed).toBe(true)
    expect(faulty.details.interrupted).toBe(false)

    const report = createExplorationReport(faulty.details, {
      actionCounts: faulty.counts,
      appRevision: __NOTES_GIT_REVISION__,
      classification: "controlled-defect",
      durationMs: faulty.durationMs,
      environment: "vitest-browser",
      feature: "note-creation",
      initialState: { notes: [] },
      layer: "notes-data-provider",
      modelRevision: "creation-v1",
      profile: noteModelProfile,
      toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
    })

    expect(report.invariant).toBe("created-notes-survive-reload")
    expect(report.originalActions.length).toBeGreaterThan(
      report.minimalActions.length,
    )
    expect(report.minimalActions).toEqual(["create", "create", "reload"])
    expect(report.replayPath).not.toBeNull()
    expect(report.actionCounts.exploration.executed).toBeGreaterThan(0)
    expect(report.actionCounts.shrinking.executed).toBeGreaterThan(0)

    const replay = await fc.check(
      fc.asyncProperty(
        fc.commands(faulty.commands, {
          maxCommands: 10,
          replayPath: report.replayPath ?? undefined,
        }),
        async (commands) => {
          await executeCreationCommands(commands, "drop-second-save")
        },
      ),
      {
        endOnFailure: true,
        numRuns: 1,
        path: report.path,
        seed: report.seed,
      },
    )
    expect(replay.failed).toBe(true)
    expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)

    const directCounts = createExplorationActionCounts()
    const directPhase = () => "exploration" as const
    const directCommands = [
      new CreateNoteCommand(directCounts, directPhase),
      new CreateNoteCommand(directCounts, directPhase),
      new ReloadCreatedNotesCommand(directCounts, directPhase),
    ]
    await expect(
      executeCreationCommands(directCommands, "drop-second-save"),
    ).rejects.toMatchObject({ invariant: report.invariant })
    await expect(
      executeCreationCommands(directCommands, "none"),
    ).resolves.toBeUndefined()

    console.info(JSON.stringify(report))
  })
})
