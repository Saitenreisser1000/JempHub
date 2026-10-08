import { DEFAULT_TIME_PER_BLOCK_MS } from '@/features/timeline/config/grid'

export function safeTimePerBlockMs(timePerBlockMs) {
  const n = Number(timePerBlockMs)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIME_PER_BLOCK_MS
}

export function gridIndexToStartMs(gridIndex, timePerBlockMs = DEFAULT_TIME_PER_BLOCK_MS) {
  const i = Number(gridIndex)
  const safeIndex = Number.isFinite(i) && i > 0 ? i : 1
  return (safeIndex - 1) * safeTimePerBlockMs(timePerBlockMs)
}

export function lengthBlocksToDurationMs(lengthBlocks, timePerBlockMs = DEFAULT_TIME_PER_BLOCK_MS) {
  const l = Number(lengthBlocks)
  const safeLength = Number.isFinite(l) && l > 0 ? l : 1
  return safeLength * safeTimePerBlockMs(timePerBlockMs)
}

export function playheadMsToGridIndex(playheadMs, timePerBlockMs = DEFAULT_TIME_PER_BLOCK_MS) {
  const t = Number(playheadMs)
  const safePlayhead = Number.isFinite(t) && t >= 0 ? t : 0
  return safePlayhead / safeTimePerBlockMs(timePerBlockMs) + 1
}
