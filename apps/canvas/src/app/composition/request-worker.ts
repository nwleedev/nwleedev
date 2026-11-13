export async function requestWorker<Request, Result>(
  createWorker: () => Worker,
  request: Request,
  decode: (value: unknown) => Result | undefined,
  signal?: AbortSignal,
): Promise<Result> {
  signal?.throwIfAborted()
  const worker = createWorker()
  let cancel: (() => void) | undefined
  try {
    return await new Promise<Result>((resolve, reject) => {
      const fail = () => reject(new Error("Worker request failed"))
      cancel = () => reject(signal?.reason)
      signal?.addEventListener("abort", cancel, { once: true })
      worker.addEventListener("error", fail, { once: true })
      worker.addEventListener("messageerror", fail, { once: true })
      worker.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
        const result = decode(data)
        if (result === undefined) fail()
        else resolve(result)
      }, { once: true })
      worker.postMessage(request)
    })
  } finally {
    if (cancel) signal?.removeEventListener("abort", cancel)
    worker.terminate()
  }
}
