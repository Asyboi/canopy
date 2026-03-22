import type { AnalysisResult } from '../lib/types'

interface Props {
  totals: AnalysisResult['totals']
  sciTotals: AnalysisResult['sciTotals']
  features: AnalysisResult['features']
}

function PotentialSavingsCard({ features }: { features: AnalysisResult['features'] }) {
  let totalSciSavings = 0
  let totalCurrentSci = 0

  for (const f of features) {
    const sci = f.sci?.sciGco2PerR ?? 0
    totalCurrentSci += sci
    for (const s of f.suggestions) {
      if (s.status === 'suggested') {
        totalSciSavings += sci * (s.estimatedSavingsPercent / 100)
      }
    }
  }

  if (totalSciSavings === 0) return null

  const pct = totalCurrentSci > 0 ? (totalSciSavings / totalCurrentSci) * 100 : 0

  return (
    <div className="flex items-center justify-between bg-canopy-accent/10 border border-canopy-accent/30 rounded px-2.5 py-1.5">
      <span className="text-canopy-accent text-[10px]">Potential reduction</span>
      <span className="text-canopy-accent text-[10px] tabular-nums font-mono font-medium">
        ~{totalSciSavings.toFixed(1)} gCO₂ ({pct.toFixed(0)}%)
      </span>
    </div>
  )
}

export default function StatCards({ totals, sciTotals: _sciTotals, features }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-canopy-muted text-[10px] uppercase tracking-widest px-0.5">
        Monthly Impact
      </p>
      <div className="flex items-center justify-between bg-canopy-card border border-canopy-border rounded px-2.5 py-1.5">
        <span className="text-canopy-muted text-[10px]">Electricity</span>
        <span className="text-canopy-secondary text-[10px] tabular-nums font-mono">~{totals.electricityKwh.toFixed(3)} kWh</span>
      </div>
      <div className="flex items-center justify-between bg-canopy-card border border-canopy-border rounded px-2.5 py-1.5">
        <span className="text-canopy-muted text-[10px]">Carbon</span>
        <span className="text-canopy-secondary text-[10px] tabular-nums font-mono">~{totals.carbonKgCo2e.toFixed(4)} kgCO₂e</span>
      </div>
      <div className="flex items-center justify-between bg-canopy-card border border-canopy-border rounded px-2.5 py-1.5">
        <span className="text-canopy-muted text-[10px]">Water</span>
        <span className="text-canopy-secondary text-[10px] tabular-nums font-mono">~{totals.waterLiters.toFixed(3)} L</span>
      </div>
      <PotentialSavingsCard features={features} />
    </div>
  )
}
