import type { AnalysisResult } from '../lib/types'

interface Props {
  totals: AnalysisResult['totals']
}

function StatCard({
  label,
  value,
  unit,
  icon,
}: {
  label: string
  value: number
  unit: string
  icon: string
}) {
  const display =
    value < 0.001 ? value.toExponential(2) : value < 1 ? value.toFixed(4) : value.toFixed(3)

  return (
    <div className="bg-canopy-card border border-canopy-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-canopy-muted text-xs mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-canopy-text text-lg font-semibold tabular-nums">{display}</span>
        <span className="text-canopy-muted text-xs">{unit}</span>
      </div>
    </div>
  )
}

export default function StatCards({ totals }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-canopy-muted text-xs uppercase tracking-widest px-0.5">
        Total Est. Impact
      </p>
      <StatCard
        label="Electricity"
        value={totals.electricityKwh}
        unit="kWh"
        icon="⚡"
      />
      <StatCard
        label="Carbon"
        value={totals.carbonKgCo2e}
        unit="kg CO₂e"
        icon="🌫️"
      />
      <StatCard
        label="Water"
        value={totals.waterLiters}
        unit="L"
        icon="💧"
      />
    </div>
  )
}
