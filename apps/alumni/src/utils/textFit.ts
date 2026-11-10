export type TextMeasure = (text: string, fontSize: number) => number

export type TextFitOptions = {
  width: number
  height: number
  maxFontSize: number
  minFontSize: number
  preserveLayoutUntil: number
  maxLines: number
  lineHeight?: number
  letterSpacing?: number
  compressedLetterSpacing?: number
  padding: { top: number; right: number; bottom: number; left: number }
  compressedPadding: { top: number; right: number; bottom: number; left: number }
  measureText: TextMeasure
}

export type TextFitResult = {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  padding: TextFitOptions['padding']
  lines: string[]
  fits: boolean
  compressed: boolean
}

function interpolate(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function wrapText(text: string, width: number, fontSize: number, letterSpacing: number, measureText: TextMeasure) {
  const measure = (value: string) => measureText(value, fontSize) + Math.max(0, value.length - 1) * letterSpacing
  const lines: string[] = []

  text.split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      return
    }
    let current = ''
    words.forEach((word) => {
      if (!current && measure(word) > width) {
        let chunk = ''
        for (const character of word) {
          if (chunk && measure(`${chunk}${character}`) > width) {
            lines.push(chunk)
            chunk = character
          } else {
            chunk += character
          }
        }
        current = chunk
        return
      }
      const candidate = current ? `${current} ${word}` : word
      if (current && measure(candidate) > width) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    })
    if (current) lines.push(current)
  })
  return lines.length ? lines : ['']
}

export function calculateTextFit(text: string, options: TextFitOptions): TextFitResult {
  const lineHeight = options.lineHeight ?? 1.12
  const baseLetterSpacing = options.letterSpacing ?? 0
  const compressedLetterSpacing = options.compressedLetterSpacing ?? baseLetterSpacing
  let best: TextFitResult | null = null

  for (let fontSize = options.maxFontSize; fontSize >= options.minFontSize; fontSize -= 1) {
    const compression = fontSize < options.preserveLayoutUntil
      ? (options.preserveLayoutUntil - fontSize) / Math.max(1, options.preserveLayoutUntil - options.minFontSize)
      : 0
    const padding = {
      top: interpolate(options.padding.top, options.compressedPadding.top, compression),
      right: interpolate(options.padding.right, options.compressedPadding.right, compression),
      bottom: interpolate(options.padding.bottom, options.compressedPadding.bottom, compression),
      left: interpolate(options.padding.left, options.compressedPadding.left, compression),
    }
    const letterSpacing = interpolate(baseLetterSpacing, compressedLetterSpacing, compression)
    const contentWidth = Math.max(1, options.width - padding.left - padding.right)
    const contentHeight = Math.max(1, options.height - padding.top - padding.bottom)
    const lines = wrapText(text, contentWidth, fontSize, letterSpacing, options.measureText)
    const fits = lines.length <= options.maxLines && lines.length * fontSize * lineHeight <= contentHeight
    const result = { fontSize, lineHeight, letterSpacing, padding, lines, fits, compressed: compression > 0 }
    if (fits) return result
    best = result
  }

  return { ...best!, fits: false, compressed: true }
}