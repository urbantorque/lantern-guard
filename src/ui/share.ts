/**
 * Sharing, always started by the player: the system share sheet where there is
 * one (iPhone, Android), otherwise the clipboard or a file download. Nothing is
 * ever sent anywhere by the game itself.
 */

export type ShareOutcome = 'shared' | 'copied' | 'saved' | 'cancelled' | 'failed'

const aborted = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** Shares a line of text (a challenge result), falling back to the clipboard. */
export async function shareText(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (aborted(e)) return 'cancelled'
    }
  }
  return copyText(text)
}

export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Saves a file through a temporary link. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Shares a picture through the share sheet where files can be shared, otherwise downloads it. */
export async function shareImage(canvas: HTMLCanvasElement, filename: string, text: string): Promise<ShareOutcome> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return 'failed'
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if (aborted(e)) return 'cancelled'
    }
  }
  downloadBlob(blob, filename)
  return 'saved'
}
