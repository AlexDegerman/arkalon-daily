'use client'
// Renders an offscreen DOM element to a PNG Blob using html2canvas.
// Returns null if rendering fails or times out.
const RENDER_TIMEOUT_MS = 10_000
const TO_BLOB_TIMEOUT_MS = 5_000
export async function generateShareImage(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    // Load html2canvas only when image generation is requested.
    const html2canvas = (await import('html2canvas')).default
    // Prevent rendering failures from leaving the share flow stuck indefinitely.
    const canvas = await Promise.race([
      html2canvas(element, {
        backgroundColor: '#0a0e14',
        scale: 2, // Improve output quality for shared images
        useCORS: false,
        allowTaint: false,
        logging: false,
        width: 540,
        height: 675,
        onclone: (clonedDoc) => {
          // Disable animations and complex backgrounds in the clone to keep rendering stable.
          const style = clonedDoc.createElement('style')
          style.textContent =
            '*, *::before, *::after { animation: none !important;' +
            ' background-image: none !important; }'
          clonedDoc.head.appendChild(style)
        }
      }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), RENDER_TIMEOUT_MS)
      )
    ])
    if (!canvas) return null
    return await new Promise<Blob | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), TO_BLOB_TIMEOUT_MS)
      canvas.toBlob(
        (blob) => {
          clearTimeout(timer)
          resolve(blob)
        },
        'image/png',
        0.95
      )
    })
  } catch {
    return null
  }
}
