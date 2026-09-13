import { expect, test, type Browser, type Page } from "@playwright/test"
import * as fc from "fast-check"

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

import { readAppRevision } from "../test-app-revision.js"
import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"
import {
  noteIdFromHref,
  readStoredNote,
} from "./support/read-stored-note"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

type MobileSaveDefect = "block-save" | "none"

type MobileSaveModel = {
  input: string
  observationPending: boolean
  stored: string
  view: "confirming" | "detail" | "list"
}

type MobileSaveReal = {
  continueEditing(): Promise<void>
  discard(): Promise<void>
  edit(content: string): Promise<void>
  inspect(expected: MobileSaveModel): Promise<void>
  leave(): Promise<void>
  open(content: string): Promise<void>
  save(): Promise<void>
}

abstract class MobileSaveCommand
  implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal>
{
  constructor(
    protected readonly counts: ExplorationActionCounts,
    protected readonly phase: () => ExplorationPhase,
  ) {}

  protected accept(accepted: boolean) {
    recordExplorationActionCheck(
      this.counts,
      this.phase(),
      this.toString(),
      accepted,
    )
    return accepted
  }

  protected recordExecution() {
    recordExplorationActionExecution(
      this.counts,
      this.phase(),
      this.toString(),
    )
  }

  abstract check(model: Readonly<MobileSaveModel>): boolean
  abstract run(model: MobileSaveModel, real: MobileSaveReal): Promise<void>
  abstract toString(): string
}

class OpenMobileNoteCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "list")
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.open(model.stored)
    model.input = model.stored
    model.view = "detail"
  }

  toString() {
    return "open-detail"
  }
}

class EditMobileNoteCommand extends MobileSaveCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly label: string,
    private readonly content: string,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "detail")
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.edit(this.content)
    model.input = this.content
  }

  toString() {
    return this.label
  }
}

class SaveMobileNoteCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "detail" && model.input !== model.stored)
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.save()
    model.stored = model.input
    model.observationPending = true
  }

  toString() {
    return "save"
  }
}

class LeaveMobileNoteCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "detail" && model.input !== model.stored)
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.leave()
    model.view = "confirming"
  }

  toString() {
    return "attempt-leave"
  }
}

class ContinueMobileEditingCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "confirming")
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.continueEditing()
    model.view = "detail"
  }

  toString() {
    return "continue-editing"
  }
}

class DiscardMobileChangesCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.view === "confirming")
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.discard()
    model.input = model.stored
    model.observationPending = true
    model.view = "list"
  }

  toString() {
    return "discard-changes"
  }
}

class InspectMobileSaveCommand extends MobileSaveCommand {
  check(model: Readonly<MobileSaveModel>) {
    return this.accept(model.observationPending)
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    this.recordExecution()
    await real.inspect(model)
    model.observationPending = false
  }

  toString() {
    return "inspect-stored"
  }
}

async function installBlockedMobileSave(page: Page) {
  await page.evaluate(() => {
    type SaveDefectWindow = typeof window & {
      controlledSaveBlocked?: boolean
    }

    window.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element | null)?.closest("button")
        if (button?.textContent?.trim() !== "저장") {
          return
        }

        event.preventDefault()
        event.stopImmediatePropagation()
        ;(window as SaveDefectWindow).controlledSaveBlocked = true
      },
      true,
    )
  })
}

async function executeMobileSaveCommands(
  browser: Browser,
  commands: Iterable<fc.AsyncCommand<MobileSaveModel, MobileSaveReal>>,
  defect: MobileSaveDefect,
) {
  const context = await browser.newContext({
    isMobile: true,
    viewport: { height: 720, width: 320 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const initialContent = "모바일 저장 기준 원문"
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: "메모 열기" }).getAttribute("href"),
    )
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe(initialContent)
    await note.getByRole("link", { name: "메모 열기" }).click()
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      initialContent,
    )

    if (defect === "block-save") {
      await installBlockedMobileSave(page)
    }

    const real: MobileSaveReal = {
      async continueEditing() {
        const dialog = page.getByRole("dialog", {
          name: "저장하지 않은 변경사항",
        })
        await dialog.getByRole("button", { name: "계속 편집" }).click()
        await expect(page.getByRole("textbox", { name: "메모 내용" })).toBeFocused()
      },
      async discard() {
        const dialog = page.getByRole("dialog", {
          name: "저장하지 않은 변경사항",
        })
        await dialog.getByRole("button", { name: "변경사항 버리기" }).click()
        await expect(page).toHaveURL("/")
      },
      async edit(content) {
        await page.getByRole("textbox", { name: "메모 내용" }).fill(content)
      },
      async inspect(expected) {
        const stored = await readStoredNote(page, noteId)
        const observed = {
          input:
            expected.view === "detail"
              ? await page.getByRole("textbox", { name: "메모 내용" }).inputValue()
              : expected.stored,
          stored: stored?.content ?? null,
          view: expected.view,
          viewport: page.viewportSize(),
        }
        const wanted = {
          input: expected.input,
          stored: expected.stored,
          view: expected.view,
          viewport: { height: 720, width: 320 },
        }
        if (
          observed.input !== wanted.input ||
          observed.stored !== wanted.stored ||
          observed.view !== wanted.view ||
          observed.viewport?.height !== wanted.viewport.height ||
          observed.viewport?.width !== wanted.viewport.width
        ) {
          throw new ExplorationInvariantError(
            "mobile-save-and-leave-choice-preserve-content",
            wanted,
            observed,
          )
        }
      },
      async leave() {
        await page.getByRole("link", { exact: true, name: "메모 목록" }).click()
        await expect(
          page.getByRole("dialog", { name: "저장하지 않은 변경사항" }),
        ).toBeVisible()
      },
      async open(content) {
        const current = page.getByRole("article").filter({ hasText: content })
        await current.getByRole("link", { name: "메모 열기" }).click()
        await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
          content,
        )
      },
      async save() {
        await page.evaluate(() => {
          ;(
            window as typeof window & { controlledSaveBlocked?: boolean }
          ).controlledSaveBlocked = false
        })
        await page.getByRole("button", { exact: true, name: "저장" }).click()
        await page.waitForFunction(() => {
          const saveBlocked = (
            window as typeof window & { controlledSaveBlocked?: boolean }
          ).controlledSaveBlocked
          const saved = [...document.querySelectorAll('[role="status"]')].some(
            (element) => element.textContent?.includes("저장했습니다."),
          )
          return saveBlocked === true || saved
        })
      },
    }

    await fc.asyncModelRun(
      () => ({
        model: {
          input: initialContent,
          observationPending: false,
          stored: initialContent,
          view: "detail" as const,
        },
        real,
      }),
      commands,
    )
  } finally {
    await context.close()
  }
}

async function checkMobileSaveExploration(
  browser: Browser,
  defect: MobileSaveDefect,
  saveOnly: boolean,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const essentialCommands = [
    fc.constant(new OpenMobileNoteCommand(counts, currentPhase)),
    fc.constant(
      new EditMobileNoteCommand(counts, currentPhase, "edit-a", "모바일 입력 A"),
    ),
    fc.constant(
      new EditMobileNoteCommand(counts, currentPhase, "edit-b", "모바일 입력 B"),
    ),
    fc.constant(new SaveMobileNoteCommand(counts, currentPhase)),
    fc.constant(new InspectMobileSaveCommand(counts, currentPhase)),
  ]
  const commands = saveOnly
    ? essentialCommands
    : [
        ...essentialCommands,
        fc.constant(new LeaveMobileNoteCommand(counts, currentPhase)),
        fc.constant(new ContinueMobileEditingCommand(counts, currentPhase)),
        fc.constant(new DiscardMobileChangesCommand(counts, currentPhase)),
      ]
  const property = fc.asyncProperty(
    fc.commands(commands, { maxCommands: 9 }),
    async (generatedCommands) => {
      try {
        await executeMobileSaveCommands(browser, generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = performance.now()
  const details = await fc.check(property, {
    interruptAfterTimeLimit: Math.max(
      noteModelSettings.interruptAfterTimeLimit,
      60_000,
    ),
    markInterruptAsFailure: true,
    numRuns: 20,
    seed: defect === "none" ? 4 : 5,
    verbose: true,
  })

  return {
    commands,
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

test("메모 작성, 자동 저장, 새로고침과 삭제 복원을 같은 순서로 확인한다", async ({
  page,
}) => {
  const initialContent = "모델 검사 메모"
  const revisedContent = "자동 저장한 모델 검사 메모"
  const note = await createNoteThroughUi(page, initialContent)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await page.clock.install()
  await editor.fill(revisedContent)
  await page.clock.fastForward(800)
  await expect(editor).toHaveValue(revisedContent)

  await page.reload()
  const restoredNote = page.getByRole("article", { exact: true, name: "메모" })
  await expect(
    restoredNote.getByRole("textbox", { name: "메모 내용" }),
  ).toHaveValue(revisedContent)

  await restoredNote.getByRole("button", { name: "메모 삭제" }).click()
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 제거했습니다.",
  })
  await removalNotice.getByRole("button", { name: "취소" }).click()
  await expect(
    page.getByRole("textbox", { name: "메모 내용" }),
  ).toHaveValue(revisedContent)
})

test("800ms 타이머와 blur 및 내부 이동이 최신 원문을 저장한다", async ({
  browser,
}) => {
  const context = await browser.newContext()

  try {
    const page = await context.newPage()
    await page.clock.install()
    await page.goto("/")
    const initialContent = "자동 저장 기준 원문"
    const note = await createNoteThroughUi(page, initialContent)
    const articleId = await note.getAttribute("id")
    expect(articleId).not.toBeNull()
    const noteId = decodeURIComponent(
      articleId!.slice("note-".length, -"-board".length),
    )
    const editor = note.getByRole("textbox", { name: "메모 내용" })

    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe(initialContent)

    await editor.fill("타이머로 저장할 원문")
    await page.clock.fastForward(700)
    expect((await readStoredNote(page, noteId))?.content).toBe(initialContent)
    await page.clock.fastForward(100)
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("타이머로 저장할 원문")

    await editor.fill("blur로 저장할 원문")
    await editor.press("Tab")
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("blur로 저장할 원문")

    await editor.fill("내부 이동 전에 저장할 원문")
    await page.getByRole("link", { name: "사용 빈도" }).click()
    await expect(page.getByRole("heading", { name: "사용 빈도" })).toBeVisible()
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("내부 이동 전에 저장할 원문")
  } finally {
    await context.close()
  }
})

test("모바일 저장 누락을 축소하고 이탈 선택을 생성한다", async ({ browser }) => {
  test.setTimeout(180_000)
  const normal = await checkMobileSaveExploration(browser, "none", false)
  expect(normal.details.failed).toBe(false)
  expect(normal.details.interrupted).toBe(false)
  console.info(
    JSON.stringify({
      actionCounts: normal.counts,
      appRevision: readAppRevision(),
      classification: "normal",
      durationMs: normal.durationMs,
      environment: `${browser.browserType().name()}-mobile-320x720`,
      feature: "mobile-note-save",
      layer: "note-detail-page",
      modelRevision: "mobile-save-v1",
      profile: noteModelProfile,
      runs: normal.details.numRuns,
      seed: normal.details.seed,
      termination: "completed",
      toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
    }),
  )

  const faulty = await checkMobileSaveExploration(browser, "block-save", true)
  expect(faulty.details.failed).toBe(true)
  expect(faulty.details.interrupted).toBe(false)
  const report = createExplorationReport(faulty.details, {
    actionCounts: faulty.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: faulty.durationMs,
    environment: `${browser.browserType().name()}-mobile-320x720`,
    feature: "mobile-note-save",
    initialState: {
      input: "모바일 저장 기준 원문",
      stored: "모바일 저장 기준 원문",
      view: "detail",
      viewport: { height: 720, width: 320 },
    },
    layer: "note-detail-page",
    modelRevision: "mobile-save-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })

  expect(report.invariant).toBe(
    "mobile-save-and-leave-choice-preserve-content",
  )
  expect(report.originalActions.length).toBeGreaterThan(
    report.minimalActions.length,
  )
  expect(report.minimalActions.at(-2)).toBe("save")
  expect(report.minimalActions.at(-1)).toBe("inspect-stored")
  expect(report.minimalActions).toHaveLength(3)
  expect(report.replayPath).not.toBeNull()

  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(faulty.commands, {
        maxCommands: 9,
        replayPath: report.replayPath ?? undefined,
      }),
      async (generatedCommands) => {
        await executeMobileSaveCommands(browser, generatedCommands, "block-save")
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
    new EditMobileNoteCommand(
      directCounts,
      directPhase,
      "edit-a",
      "모바일 입력 A",
    ),
    new SaveMobileNoteCommand(directCounts, directPhase),
    new InspectMobileSaveCommand(directCounts, directPhase),
  ]
  await expect(
    executeMobileSaveCommands(browser, directCommands, "block-save"),
  ).rejects.toMatchObject({ invariant: report.invariant })
  await expect(
    executeMobileSaveCommands(browser, directCommands, "none"),
  ).resolves.toBeUndefined()

  const leaveCounts = createExplorationActionCounts()
  const leavePhase = () => "exploration" as const
  const leaveAndReopen = [
    new EditMobileNoteCommand(
      leaveCounts,
      leavePhase,
      "edit-b",
      "모바일 입력 B",
    ),
    new LeaveMobileNoteCommand(leaveCounts, leavePhase),
    new ContinueMobileEditingCommand(leaveCounts, leavePhase),
    new LeaveMobileNoteCommand(leaveCounts, leavePhase),
    new DiscardMobileChangesCommand(leaveCounts, leavePhase),
    new OpenMobileNoteCommand(leaveCounts, leavePhase),
    new InspectMobileSaveCommand(leaveCounts, leavePhase),
  ]
  await expect(
    executeMobileSaveCommands(browser, leaveAndReopen, "none"),
  ).resolves.toBeUndefined()

  console.info(JSON.stringify(report))
  console.info(
    JSON.stringify({
      actionCounts: leaveCounts,
      classification: "required-sequence",
      environment: `${browser.browserType().name()}-mobile-320x720`,
      feature: "mobile-note-leave-choice",
      layer: "note-detail-page",
      termination: "completed",
    }),
  )
})

test("삭제 뒤 순서를 바꾸고 복원한 메모를 새로고침 뒤에도 유지한다", async ({
  page,
}) => {
  const first = await createNoteThroughUi(page, "첫 번째 순서 메모")
  const second = await createNoteThroughUi(page, "두 번째 순서 메모")
  await createNoteThroughUi(page, "세 번째 순서 메모")

  await second.getByRole("button", { name: "메모 삭제" }).click()
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 제거했습니다.",
  })
  await expect(removalNotice).toBeVisible()
  await first.getByRole("button", { name: "메모를 맨 앞으로" }).click()
  await removalNotice.getByRole("button", { name: "취소" }).click()

  await expect(page.getByRole("article", { exact: true, name: "메모" })).toHaveCount(3)

  await page.reload()
  const editors = await page.getByRole("textbox", { name: "메모 내용" }).all()
  const contents = await Promise.all(editors.map((editor) => editor.inputValue()))

  expect(contents).toEqual(
    expect.arrayContaining(["첫 번째 순서 메모", "두 번째 순서 메모", "세 번째 순서 메모"]),
  )
})

test("연속 생성한 메모의 정확한 개수와 원문을 새로고침 뒤 유지한다", async ({
  page,
}) => {
  await createNoteThroughUi(page, "첫 번째 생성 메모")
  await createNoteThroughUi(page, "두 번째 생성 메모")

  await page.reload()
  const notes = page.getByRole("article", { exact: true, name: "메모" })
  await expect(notes).toHaveCount(2)
  const editors = await page.getByRole("textbox", { name: "메모 내용" }).all()
  const contents = await Promise.all(editors.map((editor) => editor.inputValue()))

  expect(contents).toEqual(["첫 번째 생성 메모", "두 번째 생성 메모"])
})

test("생성한 원문은 후보별 새 브라우저 문맥에서 자동 저장 뒤 복원된다", async ({
  browser,
}) => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 32, unit: "grapheme-ascii" }),
      fc.string({ minLength: 1, maxLength: 32, unit: "grapheme-ascii" }),
      async (initialContent, revisedContent) => {
        const context = await browser.newContext()

        try {
          const page = await context.newPage()
          await page.goto("/")
          await page.clock.install()
          const note = await createNoteThroughUi(page, initialContent)
          const editor = note.getByRole("textbox", { name: "메모 내용" })

          await editor.fill(revisedContent)
          await page.clock.fastForward(800)
          await page.reload()

          await expect(
            page
              .getByRole("article", { exact: true, name: "메모" })
              .getByRole("textbox", { name: "메모 내용" }),
          ).toHaveValue(revisedContent)
        } finally {
          await context.close()
        }
      },
    ),
    { numRuns: 3 },
  )
})

test("320px 화면에서는 명시적 저장 뒤 새로고침해도 원문을 유지한다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: true,
    viewport: { height: 720, width: 320 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    await createMobileNoteThroughUi(page, "모바일 명시적 저장 메모")
    await page.reload()

    await expect(page.getByRole("article")).toContainText("모바일 명시적 저장 메모")
  } finally {
    await context.close()
  }
})
