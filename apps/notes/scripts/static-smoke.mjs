import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { chromium, expect, firefox, webkit } from "@playwright/test"

import { createStaticServer } from "./static-server.mjs"

const executeFile = promisify(execFile)
const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const repositoryRoot = path.resolve(packageRoot, "../..")
const temporaryRoot = path.join(repositoryRoot, "temps")

async function listen(server, host = "localhost") {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, host, resolve)
  })

  const address = server.address()

  if (!address || typeof address === "string") {
    throw new Error("Static server did not provide a TCP port.")
  }

  return address.port
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function verifyOrigin(browser, origin) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const stylesheets = []
  page.on("response", (response) => {
    if (
      (response.headers()["content-type"] ?? "").startsWith("text/css")
    ) {
      stylesheets.push(response)
    }
  })

  await page.goto(`${origin}/analysis/`)
  await page.getByRole("heading", { level: 1 }).waitFor()
  assert.equal(page.workers().length, 0)
  assert.equal(stylesheets.length > 0, true)
  assert.equal(stylesheets.every((response) => response.ok()), true)

  const button = page.getByRole("button", { name: "분석 실행" })

  const workerStarted = page.waitForEvent("worker")

  await button.click()
  const worker = await workerStarted
  await expect(button).toBeEnabled()
  await page.getByRole("status").waitFor()
  const completedStatus = await page.getByRole("status").textContent()
  assert.equal(page.workers().length, 1)

  const workerUrl = worker.url()
  assert.match(workerUrl ?? "", /\.js$/u)

  const workerResponse = await context.request.get(workerUrl)
  assert.equal(workerResponse.ok(), true)
  assert.match(
    workerResponse.headers()["content-type"] ?? "",
    /^text\/javascript/u,
  )

  await page.getByRole("link", { exact: true, name: "메모" }).click()
  await page.getByRole("heading", { level: 1 }).waitFor()
  await page
    .getByRole("link", { exact: true, name: "텍스트 분석" })
    .click()
  await expect(page.getByRole("status")).toHaveText(completedStatus ?? "")

  await page.reload()
  await page.getByRole("heading", { level: 1 }).waitFor()
  const reloadedStatuses = await page.getByRole("status").allTextContents()
  assert.equal(reloadedStatuses.includes(completedStatus ?? ""), false)

  await context.close()
}

async function verifyUnsupportedOrigin(browser, origin) {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(origin)
  await page
    .getByRole("heading", { level: 1, name: "지원하지 않는 접속 주소" })
    .waitFor()
  await expect(page.getByText(/HTTPS 주소 또는 http:\/\/localhost/u)).toBeVisible()
  assert.equal(page.workers().length, 0)

  const databaseNames = await page.evaluate(async () =>
    (await indexedDB.databases()).map((database) => database.name),
  )
  assert.equal(databaseNames.includes("personal-notes"), false)

  await context.close()
}

async function readNoteCount(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction("notes", "readonly")
          const count = transaction.objectStore("notes").count()
          count.onerror = () => reject(count.error)
          count.onsuccess = () => resolve(count.result)
          transaction.oncomplete = () => database.close()
        }
      }),
  )
}

async function verifyStorageIsolation(browser, httpOrigin, httpsOrigin) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

  await page.goto(httpOrigin)
  await page.getByRole("status").waitFor()
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction("notes", "readwrite")
          transaction.objectStore("notes").put({
            content: "origin marker",
            contentRevision: 0,
            createdAt: "2026-08-31T01:00:00.000Z",
            geometry: {
              height: 240,
              width: 320,
              x: 0,
              y: 0,
              zIndex: 0,
            },
            id: "origin-marker",
            revision: 0,
            updatedAt: "2026-08-31T01:00:00.000Z",
          })
          transaction.onabort = () => reject(transaction.error)
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
        }
      }),
  )
  await page.reload()
  await expect(page.getByRole("status")).toContainText(/1/u)

  await page.goto(httpsOrigin)
  await page.getByRole("status").waitFor()
  assert.equal(await readNoteCount(page), 0)

  await page.goto(httpOrigin)
  await page.getByRole("status").waitFor()
  assert.equal(await readNoteCount(page), 1)

  await context.close()
}

async function run() {
  await mkdir(temporaryRoot, { recursive: true })
  const temporaryDirectory = await mkdtemp(
    path.join(temporaryRoot, "notes-static-smoke-"),
  )
  const certificatePath = path.join(temporaryDirectory, "localhost.crt")
  const keyPath = path.join(temporaryDirectory, "localhost.key")
  const outputRoot = path.join(packageRoot, "out")
  let httpServer
  let httpsServer
  let unsupportedHttpServer
  const browsers = []

  try {
    await executeFile("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certificatePath,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ])

    httpServer = await createStaticServer({
      protocol: "http",
      root: outputRoot,
    })
    httpsServer = await createStaticServer({
      cert: certificatePath,
      key: keyPath,
      protocol: "https",
      root: outputRoot,
    })
    unsupportedHttpServer = await createStaticServer({
      protocol: "http",
      root: outputRoot,
    })

    const httpPort = await listen(httpServer)
    const httpsPort = await listen(httpsServer)
    const unsupportedHttpPort = await listen(
      unsupportedHttpServer,
      "127.0.0.1",
    )
    for (const browserType of [chromium, firefox, webkit]) {
      const browser = await browserType.launch()
      browsers.push(browser)

      const httpOrigin = `http://localhost:${httpPort}`
      const httpsOrigin = `https://localhost:${httpsPort}`
      const unsupportedHttpOrigin = `http://127.0.0.1:${unsupportedHttpPort}`

      await verifyStorageIsolation(browser, httpOrigin, httpsOrigin)
      await verifyOrigin(browser, httpOrigin)
      await verifyOrigin(browser, httpsOrigin)
      await verifyUnsupportedOrigin(browser, unsupportedHttpOrigin)
    }

    process.stdout.write(
      "Static HTTP and HTTPS storage isolation, Worker, and address checks passed in Chromium, Firefox, and WebKit.\n",
    )
  } finally {
    await Promise.all(browsers.map((browser) => browser.close()))

    if (httpServer?.listening) {
      await close(httpServer)
    }

    if (httpsServer?.listening) {
      await close(httpsServer)
    }

    if (unsupportedHttpServer?.listening) {
      await close(unsupportedHttpServer)
    }

    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

await run()
