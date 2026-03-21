import type { Suggestion } from './types'

export const PATTERN_LABELS: Record<Suggestion['patternType'], string> = {
  POLLING: 'Polling',
  N_PLUS_ONE: 'N+1 Query',
  SYNC_BLOCKING: 'Sync Blocking',
}

export const PATTERN_DESCRIPTIONS: Record<Suggestion['patternType'], string> = {
  POLLING: 'Replace with event-driven updates',
  N_PLUS_ONE: 'Replace with batched query',
  SYNC_BLOCKING: 'Replace with async I/O',
}

export const TIER_COLORS = {
  high: 'text-tier-high bg-tier-high-bg border-tier-high/30',
  medium: 'text-tier-medium bg-tier-medium-bg border-tier-medium/30',
  low: 'text-tier-low bg-tier-low-bg border-tier-low/30',
} as const

export const TIER_DOT_COLORS = {
  high: 'bg-tier-high',
  medium: 'bg-tier-medium',
  low: 'bg-tier-low',
} as const

export const POLL_INTERVAL_MS = 10_000
