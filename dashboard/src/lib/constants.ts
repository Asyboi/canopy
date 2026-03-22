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

// Carbon equivalent conversion factors
export const CARBON_PER_MILE_KG = 0.000404        // EPA: 404g CO₂/mile
export const CARBON_PER_PHONE_CHARGE_KG = 0.000009 // ~9g CO₂ per smartphone charge
export const TREE_KG_PER_YEAR = 22                 // ~22 kg CO₂ absorbed per tree per year
export const HOURS_PER_YEAR = 8760
