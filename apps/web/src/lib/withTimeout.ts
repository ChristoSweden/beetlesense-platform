export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Request timed out after ${ms}ms`))
    }, ms)
  })
  return Promise.race([promise, timeout])
}
