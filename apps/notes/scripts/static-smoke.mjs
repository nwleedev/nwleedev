import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { chromium, expect, firefox, webkit } from "@playwright/test"

import { createStaticServer } from "./static-server.mjs"

const executeFile = promisify(execFile)
const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const repositoryRoot = path.resolve(packageRoot, "../..")
const temporaryRoot = path.join(repositoryRoot, "temps")

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "localhost", resolve)
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

  await page.goto(`${origin}/analysis/`)
  await page.getByRole("heading", { level: 1 }).waitFor()
  assert.equal(page.workers().length, 0)

  const button = page.getByRole("button")
  const buttonStyle = await button.evaluate((element) => {
    const style = getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
    }
  })
  const canvasToken = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      "--notes-color-canvas",
    ),
  )

  assert.notEqual(buttonStyle.backgroundColor, "rgba(0, 0, 0, 0)")
  assert.notEqual(buttonStyle.borderRadius, "0px")
  assert.notEqual(canvasToken.trim(), "")

  const workerStarted = page.waitForEvent("worker")

  await button.click()
  const worker = await workerStarted
  await expect(button).toBeEnabled()
  await page.getByRole("status").waitFor()
  assert.equal(page.workers().length, 1)

  const workerUrl = worker.url()
  assert.match(workerUrl ?? "", /\.js$/u)

  const workerResponse = await context.request.get(workerUrl)
  assert.equal(workerResponse.ok(), true)
  assert.match(
    workerResponse.headers()["content-type"] ?? "",
    /^text\/javascript/u,
  )

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

    const httpPort = await listen(httpServer)
    const httpsPort = await listen(httpsServer)
    for (const browserType of [chromium, firefox, webkit]) {
      const browser = await browserType.launch()
      browsers.push(browser)

      await verifyOrigin(browser, `http://localhost:${httpPort}`)
      await verifyOrigin(browser, `https://localhost:${httpsPort}`)
    }

    const workerAssets = await readFile(
      path.join(outputRoot, "analysis", "index.html"),
      "utf8",
    )
    assert.match(workerAssets, /_next\/static/u)

    process.stdout.write(
      "Static HTTP and HTTPS Worker smoke check passed in Chromium, Firefox, and WebKit.\n",
    )
  } finally {
    await Promise.all(browsers.map((browser) => browser.close()))

    if (httpServer?.listening) {
      await close(httpServer)
    }

    if (httpsServer?.listening) {
      await close(httpsServer)
    }

    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

await run()
