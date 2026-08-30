import { createReadStream } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import http from "node:http"
import https from "node:https"
import path from "node:path"
import process from "node:process"
import { pipeline } from "node:stream/promises"
import { pathToFileURL } from "node:url"

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
])

function parseArguments(argumentsList) {
  const options = {
    cert: undefined,
    host: "localhost",
    key: undefined,
    port: 4173,
    protocol: "http",
    root: "out",
  }

  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index]
    const value = argumentsList[index + 1]

    if (!name?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${name ?? "the end of the command"}.`)
    }

    const key = name.slice(2)

    if (!(key in options)) {
      throw new Error(`Unknown option ${name}.`)
    }

    options[key] = key === "port" ? Number.parseInt(value, 10) : value
  }

  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error("Port must be an integer between 0 and 65535.")
  }

  if (options.protocol !== "http" && options.protocol !== "https") {
    throw new Error("Protocol must be http or https.")
  }

  if (options.protocol === "http" && options.host !== "localhost") {
    throw new Error("HTTP serving is restricted to the localhost host name.")
  }

  if (options.protocol === "https" && (!options.cert || !options.key)) {
    throw new Error("HTTPS serving requires --cert and --key file paths.")
  }

  return options
}

async function resolveFile(root, requestPath) {
  let decodedPath

  try {
    decodedPath = decodeURIComponent(requestPath)
  } catch {
    return undefined
  }

  const relativePath = decodedPath.replace(/^\/+/, "")
  const candidates = relativePath
    ? [relativePath, path.join(relativePath, "index.html"), `${relativePath}.html`]
    : ["index.html"]

  for (const candidate of candidates) {
    const absolutePath = path.resolve(root, candidate)
    const relativeToRoot = path.relative(root, absolutePath)

    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      continue
    }

    try {
      if ((await stat(absolutePath)).isFile()) {
        return absolutePath
      }
    } catch {
      continue
    }
  }

  return undefined
}

export async function createStaticServer({ cert, key, protocol, root }) {
  const absoluteRoot = path.resolve(root)

  const handleRequest = async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost")
    const file = await resolveFile(absoluteRoot, requestUrl.pathname)

    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      response.end("Not found")
      return
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type":
        contentTypes.get(path.extname(file)) ?? "application/octet-stream",
    })
    await pipeline(createReadStream(file), response)
  }

  const handleRequestSafely = (request, response) => {
    void handleRequest(request, response).catch(() => {
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
        response.end("Internal server error")
        return
      }

      response.destroy()
    })
  }

  if (protocol === "https") {
    return https.createServer(
      {
        cert: await readFile(cert),
        key: await readFile(key),
      },
      handleRequestSafely,
    )
  }

  return http.createServer(handleRequestSafely)
}

async function listen(server, host, port) {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, resolve)
  })
}

async function runCommand() {
  const options = parseArguments(process.argv.slice(2))
  const server = await createStaticServer(options)

  await listen(server, options.host, options.port)
  process.stdout.write(
    `Serving ${path.resolve(options.root)} at ${options.protocol}://${options.host}:${options.port}\n`,
  )
}

const invokedFile = process.argv[1]

if (invokedFile && import.meta.url === pathToFileURL(invokedFile).href) {
  await runCommand()
}
