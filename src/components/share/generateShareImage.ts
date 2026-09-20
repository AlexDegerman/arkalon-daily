'use client'

// Renders an offscreen DOM element to a PNG Blob using html2canvas.
// Returns null if html2canvas is unavailable or rendering fails.
export async function generateShareImage(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    // Dynamic import so html2canvas is not in the initial bundle
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0e14',
      scale: 2, // 2x for retina
      useCORS: false,
      allowTaint: false,
      logging: false,
      width: 540,
      height: 675
    })
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
    })
  } catch {
    return null
  }
}
