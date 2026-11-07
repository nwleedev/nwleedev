import * as fc from "fast-check"
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { createNoteThroughUi } from "./support/create-note-through-ui"
import { noteContent } from "./support/note-content"
import { readStoredNote } from "./support/read-stored-note"
import { replaySequence } from "./support/replay-sequence"

type NoteCreationModel = {
  contents: string[]
}

type NoteCreationReal = {
  actions?: string[]
  page: Page
}

type StoredCreationState = {
  contents: string[]
  distinctIds: number
}

type CreationFailure = {
  actions: string[]
  expectedContents: string[]
  observed: StoredCreationState
}

async function readStoredCreationState(page: Page): Promise<StoredCreationState> {
  const ids = await page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const open = indexedDB.open("personal-notes")
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const read = db.transaction("notes")
      const keys = read.objectStore("notes").index("position").getAllKeys()
      read.oncomplete = () => {
        db.close()
        resolve(keys.result.map(String))
      }
      read.onabort = () => {
        db.close()
        reject(read.error)
      }
    }
  }))
  const notes = await Promise.all(ids.map((id) => readStoredNote(page, id)))
  return {
    contents: notes.flatMap((note) => note ? [note.content] : []).sort(),
    distinctIds: new Set(ids).size,
  }
}

async function expectStoredCreationState(page: Page, contents: string[]) {
  await expect
    .poll(() => readStoredCreationState(page))
    .toEqual({ contents: [...contents].sort(), distinctIds: contents.length })
}

async function expectVisibleNoteContents(page: Page, expected: string[]) {
  const editors = page.getByRole("textbox", { name: "메모 내용" })
  await expect(editors).toHaveCount(expected.length)
  const contents = await Promise.all(
    (await editors.all()).map((editor) => editor.inputValue()),
  )
  expect(contents).toEqual(expected)
}

class CreateNoteThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  constructor(private readonly content: string) {}

  check() {
    return true
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await createNoteThroughUi(page, this.content)
    model.contents.push(this.content)
    await expectVisibleNoteContents(page, model.contents)
    await expectStoredCreationState(page, model.contents)
  }

  toString() {
    return `create(${JSON.stringify(this.content)})`
  }
}

class FailNoteCreationThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  check() {
    return true
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await page.getByRole("button", { name: "새 메모" }).click()
    await expect(
      page.getByRole("alert").filter({
        hasText: "메모를 만들지 못했습니다. 다시 시도하세요.",
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("textbox", { name: "메모 내용" }),
    ).toHaveCount(model.contents.length)
    await expect(page.getByRole("button", { name: "새 메모" })).toBeEnabled()
  }

  toString() {
    return "fail-create"
  }
}

class ReloadNotesThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  check(model: Readonly<NoteCreationModel>) {
    return model.contents.length > 0
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await page.reload()
    await expectVisibleNoteContents(page, model.contents)
    await expectStoredCreationState(page, model.contents)
  }

  toString() {
    return "reload"
  }
}

const noteCreationCommands = fc.commands(
  [
    noteContent.map((content) => new CreateNoteThroughUiCommand(content)),
    fc.constant(new ReloadNotesThroughUiCommand()),
  ],
  { maxCommands: 4 },
)

async function contextWithoutSecondCreatedNote(browser: Browser) {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put
    const createdIds = new Set<string>()
    let omittedNoteId: string | null = null

    IDBObjectStore.prototype.put = function (value, key) {
      const record = value as {
        id: string
      }

      if (
        this.name === "notes" &&
        !createdIds.has(record.id)
      ) {
        createdIds.add(record.id)

        if (createdIds.size === 2) {
          omittedNoteId = record.id
        }
      }

      if (this.name === "notes" && record.id === omittedNoteId) {
        return this.get(record.id)
      }

      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })
  return context
}

function expectMissingCreatedNote(failure: CreationFailure | undefined) {
  if (failure === undefined) {
    throw new Error("Missing creation failure observation")
  }

  expect(failure.observed.distinctIds).toBeLessThan(
    failure.expectedContents.length,
  )
  expect(failure.observed.contents).not.toEqual(
    [...failure.expectedContents].sort(),
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("사용자의 메모 생성과 다시 열기 행동을 조합한다", async ({ browser }) => {
  await fc.assert(
    fc.asyncProperty(
      noteContent,
      noteContent,
      noteCreationCommands,
      async (firstContent, secondContent, generatedCommands) => {
        const context = await browser.newContext()

        try {
          const page = await context.newPage()
          await page.goto("/")
          const model: NoteCreationModel = { contents: [] }
          await fc.asyncModelRun(
            () => ({
              model,
              real: { page },
            }),
            [
              new CreateNoteThroughUiCommand(firstContent),
              new CreateNoteThroughUiCommand(secondContent),
              ...generatedCommands,
            ],
          )
          await expect(
            page.getByRole("textbox", { name: "메모 내용" }),
          ).toHaveCount(model.contents.length)
        } finally {
          await context.close()
        }
      },
    ),
    { numRuns: 3 },
  )
})

test("메모 생성 실패를 알리고 다음 생성 시도를 저장한다", async ({
  browser,
}) => {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put
    let failurePending = true

    IDBObjectStore.prototype.put = function (value, key) {
      if (failurePending && this.name === "notes") {
        failurePending = false
        this.transaction.abort()
        throw new DOMException("Unable to save the note", "AbortError")
      }

      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const model: NoteCreationModel = { contents: [] }
    await fc.asyncModelRun(
      () => ({
        model,
        real: { page },
      }),
      [
        new FailNoteCreationThroughUiCommand(),
        new CreateNoteThroughUiCommand("다시 시도해 저장한 메모"),
        new ReloadNotesThroughUiCommand(),
      ],
    )
    await expect(
      page.getByRole("textbox", { name: "메모 내용" }),
    ).toHaveValue("다시 시도해 저장한 메모")
  } finally {
    await context.close()
  }
})

test("두 번째 메모의 쓰기가 누락되면 화면과 저장 결과의 차이를 찾는다", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000)
  const failedCandidates: CreationFailure[] = []
  const actionArbitraries = [
    noteContent.map(
      (content) => new CreateNoteThroughUiCommand(content),
    ),
    noteContent.map(
      (content) => new CreateNoteThroughUiCommand(content),
    ),
    fc.constant(new ReloadNotesThroughUiCommand()),
  ]
  const maxCommands = 6
  const runSequence = async (
    commands: Iterable<fc.AsyncCommand<NoteCreationModel, NoteCreationReal>>,
    openContext: () => Promise<BrowserContext>,
  ) => {
    const context = await openContext()

    try {
      const page = await context.newPage()
      await page.goto("/")
      const model: NoteCreationModel = { contents: [] }
      const actions: string[] = []

      try {
        await fc.asyncModelRun(
          () => ({ model, real: { actions, page } }),
          commands,
        )
        await expectVisibleNoteContents(page, model.contents)
        await expectStoredCreationState(page, model.contents)
      } catch (error) {
        failedCandidates.push({
          actions: [...actions],
          expectedContents: [...model.contents],
          observed: await readStoredCreationState(page),
        })
        throw error
      }
    } finally {
      await context.close()
    }
  }
  const failureCommands = fc.commands(actionArbitraries, { maxCommands })
  const details = await fc.check(
    fc.asyncProperty(failureCommands, async (commands) => {
      await runSequence(commands, () => contextWithoutSecondCreatedNote(browser))
    }),
    { numRuns: 12 },
  )

  expect(details.failed).toBe(true)
  expect(details.interrupted).toBe(false)
  expect(details.numShrinks).toBeGreaterThan(0)
  expect(failedCandidates.length).toBeGreaterThan(0)
  const reducedSequence = replaySequence(details)

  const reduced = failedCandidates.at(-1)
  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(actionArbitraries, {
        maxCommands,
        replayPath: reducedSequence.replayPath,
      }),
      async (commands) => {
        await runSequence(commands, () => contextWithoutSecondCreatedNote(browser))
      },
    ),
    {
      endOnFailure: true,
      numRuns: 1,
      path: reducedSequence.path,
      seed: details.seed,
    },
  )
  expect(replay.failed).toBe(true)
  const replayFailure = failedCandidates.at(-1)
  expectMissingCreatedNote(replayFailure)

  const directCommands = [...reducedSequence.commands]
  await runSequence(
    directCommands.slice(0, -1),
    () => contextWithoutSecondCreatedNote(browser),
  )
  await expect(
    runSequence(directCommands, () => contextWithoutSecondCreatedNote(browser)),
  ).rejects.toThrow()
  const directFailure = failedCandidates.at(-1)
  expectMissingCreatedNote(directFailure)
  await runSequence(directCommands, () => browser.newContext())

  const report = {
    browser: browser.browserType().name(),
    classification: "controlled-storage-omission",
    feature: "note-creation",
    initialContents: [],
    layer: "note-board-and-indexeddb",
    minimalCommands: reducedSequence.printed,
    original: failedCandidates[0],
    path: reducedSequence.path,
    reduced,
    replay: {
      failed: replay.failed,
      observed: replayFailure?.observed,
    },
    replayPath: reducedSequence.replayPath,
    runs: details.numRuns,
    seed: details.seed,
    shrinks: details.numShrinks,
    toolVersion: fc.__version,
  }
  await testInfo.attach("note-creation-exploration.json", {
    body: Buffer.from(JSON.stringify(report)),
    contentType: "application/json",
  })
  console.info(JSON.stringify(report))
})
