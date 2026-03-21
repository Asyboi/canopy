import type { Feature } from '../lib/types'
import { TIER_COLORS, TIER_DOT_COLORS } from '../lib/constants'

interface Props {
  features: Feature[]
}

const TIER_ORDER = { high: 0, medium: 1, low: 2 } as const

function TierBadge({ tier }: { tier: Feature['sustainabilityTier'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIER_COLORS[tier]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[tier]}`} />
      {tier}
    </span>
  )
}

export default function FeatureList({ features }: Props) {
  const sorted = [...features].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.sustainabilityTier] - TIER_ORDER[b.sustainabilityTier]
    if (tierDiff !== 0) return tierDiff
    return b.sustainability.electricityKwh - a.sustainability.electricityKwh
  })

  const pendingCount = (f: Feature) =>
    f.suggestions.filter((s) => s.status === 'suggested').length

  return (
    <div className="flex flex-col gap-1">
      <p className="text-canopy-muted text-xs uppercase tracking-widest px-0.5 mt-1">Features</p>
      {sorted.length === 0 && (
        <p className="text-canopy-muted text-xs px-0.5">No features detected.</p>
      )}
      {sorted.map((f) => {
        const pending = pendingCount(f)
        return (
          <div
            key={f.id}
            className="bg-canopy-card border border-canopy-border rounded-lg p-2.5 flex flex-col gap-1.5"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-medium text-canopy-text leading-tight truncate">
                {f.name}
              </span>
              <TierBadge tier={f.sustainabilityTier} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-canopy-muted">
              <span>⚡ {f.sustainability.electricityKwh.toFixed(4)} kWh</span>
              {pending > 0 && (
                <span className="ml-auto text-canopy-green font-medium">
                  {pending} suggestion{pending > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
