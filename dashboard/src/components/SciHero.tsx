import type { AnalysisResult } from '../lib/types'

interface Props {
  sciTotals: AnalysisResult['sciTotals']
  totals: AnalysisResult['totals']
}

function SciLetter({
  letter,
  label,
  value,
  color,
}: {
  letter: string
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-bold font-mono ${color}`}>{letter}</span>
        <span className="text-canopy-muted text-[10px]">{label}</span>
      </div>
      <span className={`text-sm font-mono font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export default function SciHero({ sciTotals, totals }: Props) {
  return (
    <div className="border-b border-canopy-border bg-canopy-surface flex-shrink-0">
      <div className="px-4 py-3 flex items-stretch gap-6">

        {/* Hero value */}
        <div className="flex flex-col justify-center min-w-[140px]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] uppercase tracking-widest text-canopy-muted font-medium">
              SCI Score
            </span>
            <span
              title={sciTotals.methodology}
              className="text-[8px] text-canopy-muted/60 border border-canopy-border rounded px-1 cursor-help select-none"
            >
              est.
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-canopy-accent font-bold tabular-nums font-mono"
              style={{ fontSize: '2.25rem', lineHeight: 1 }}>
              ~{sciTotals.sciGco2PerR.toFixed(0)}
            </span>
            <span className="text-canopy-muted text-xs">gCO₂/day</span>
          </div>
          <p className="text-[9px] text-canopy-muted/60 mt-1 font-mono">
            SCI = (E × I) + M  per R
          </p>
        </div>

        {/* Divider */}
        <div className="w-px bg-canopy-border flex-shrink-0" />

        {/* E I M R breakdown */}
        <div className="flex items-center gap-5 flex-wrap">
          <SciLetter
            letter="E"
            label="Energy"
            value={`${sciTotals.eKwhPerR.toFixed(4)} kWh/day`}
            color="text-sci-e"
          />
          <SciLetter
            letter="I"
            label="Intensity"
            value={`${sciTotals.iGco2PerKwh} gCO₂/kWh`}
            color="text-sci-i"
          />
          <SciLetter
            letter="M"
            label="Embodied"
            value={`~${sciTotals.mGco2PerR.toFixed(1)} gCO₂/day`}
            color="text-sci-m"
          />
          <SciLetter
            letter="R"
            label="Functional Unit"
            value={sciTotals.functionalUnit || 'day'}
            color="text-sci-r"
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-canopy-border flex-shrink-0" />

        {/* Secondary metrics */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest text-canopy-muted">Electricity</span>
            <span className="text-canopy-secondary text-xs font-mono tabular-nums">
              ~{totals.electricityKwh.toFixed(3)} kWh/mo
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest text-canopy-muted">Carbon</span>
            <span className="text-canopy-secondary text-xs font-mono tabular-nums">
              ~{totals.carbonKgCo2e.toFixed(4)} kgCO₂e/mo
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
