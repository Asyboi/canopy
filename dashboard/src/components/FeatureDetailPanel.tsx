import type { AnalysisResult, Feature } from '../lib/types'
import { PATTERN_LABELS, TIER_COLORS } from '../lib/constants'

interface Props {
  feature: Feature | null
  history: AnalysisResult['history']
}

function SciRow({ letter, label, value, color }: { letter: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-canopy-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold font-mono w-3 ${color}`}>{letter}</span>
        <span className="text-[10px] text-canopy-muted">{label}</span>
      </div>
      <span className={`text-[10px] font-mono tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export default function FeatureDetailPanel({ feature, history }: Props) {
  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-canopy-muted text-sm">
        <div className="text-3xl mb-2">🔍</div>
        <p>No feature selected.</p>
        <p className="text-xs mt-1 text-canopy-muted/60">Click a node or feature row to inspect.</p>
      </div>
    )
  }

  const { sci, sustainability, metrics, suggestions, sustainabilityTier, files, name } = feature
  const featureHistory = history.filter((h) => h.featureId === feature.id)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())

  const pendingSuggestions = suggestions.filter((s) => s.status === 'suggested')

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      {/* Feature name & tier */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-canopy-text font-semibold text-sm leading-tight">{name}</p>
          <span className={`text-[9px] font-medium uppercase tracking-wider border rounded px-1.5 py-0.5 flex-shrink-0 ${TIER_COLORS[sustainabilityTier]}`}>
            {sustainabilityTier}
          </span>
        </div>
        <p className="text-canopy-accent font-mono text-xs mt-0.5">
          ~{sci.sciGco2PerR.toFixed(1)} gCO₂/day SCI
        </p>
      </div>

      {/* SCI breakdown */}
      <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
        <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-2">SCI Breakdown</p>
        <SciRow letter="E" label="Energy" value={`${sci.e_kwhPerR.toFixed(5)} kWh/day`} color="text-sci-e" />
        <SciRow letter="I" label="Intensity" value={`${sci.i_gco2PerKwh} gCO₂/kWh`} color="text-sci-i" />
        <SciRow letter="M" label="Embodied" value={`~${sci.m_gco2PerR.toFixed(2)} gCO₂/day`} color="text-sci-m" />
        <SciRow letter="R" label="Functional Unit" value={sci.functionalUnit || 'day'} color="text-sci-r" />
        <div className="mt-1.5 pt-1.5 border-t border-canopy-border/50">
          <span className="text-[9px] text-canopy-muted/50">Confidence: {sci.confidence}</span>
        </div>
      </div>

      {/* Sustainability */}
      <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
        <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-2">Monthly Impact</p>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-canopy-muted">Electricity</span>
            <span className="font-mono text-canopy-secondary">~{sustainability.electricityKwh.toFixed(4)} kWh</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-canopy-muted">Carbon</span>
            <span className="font-mono text-canopy-secondary">~{sustainability.carbonKgCo2e.toFixed(5)} kgCO₂e</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-canopy-muted">Water</span>
            <span className="font-mono text-canopy-secondary">~{sustainability.waterLiters.toFixed(4)} L</span>
          </div>
        </div>
      </div>

      {/* Complexity */}
      <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
        <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-2">Complexity</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-canopy-muted">LOC</span>
            <span className="text-canopy-secondary text-xs font-mono">{metrics.loc}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-canopy-muted">Cyclomatic</span>
            <span className="text-canopy-secondary text-xs font-mono">{metrics.cyclomaticComplexity}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-canopy-muted">Deps</span>
            <span className="text-canopy-secondary text-xs font-mono">{metrics.dependencyCount}</span>
          </div>
        </div>
      </div>

      {/* Pending suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-2">
            Pending Optimizations ({pendingSuggestions.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {pendingSuggestions.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-1">
                <div>
                  <p className="text-[10px] text-canopy-text">{PATTERN_LABELS[s.patternType]}</p>
                  <p className="text-[9px] text-canopy-muted/70 font-mono truncate max-w-[170px]">{s.location}</p>
                </div>
                <span className="text-canopy-accent text-[10px] font-mono shrink-0">-{s.estimatedSavingsPercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-1.5">Files ({files.length})</p>
          <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
            {files.map((f) => (
              <p key={f} className="text-[9px] text-canopy-muted/70 font-mono truncate">{f}</p>
            ))}
          </div>
        </div>
      )}

      {/* Applied history for this feature */}
      {featureHistory.length > 0 && (
        <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-1.5">Applied</p>
          <div className="flex flex-col gap-1.5">
            {featureHistory.map((h) => (
              <div key={`${h.suggestionId}-${h.appliedAt}`} className="flex flex-col gap-0.5">
                <p className="text-[10px] text-canopy-text">{PATTERN_LABELS[h.patternType as keyof typeof PATTERN_LABELS] ?? h.patternType}</p>
                {h.savingsSciGco2PerR != null && (
                  <span className="text-canopy-accent text-[9px] font-mono">-{h.savingsSciGco2PerR.toFixed(1)} gCO₂/day</span>
                )}
                <p className="text-[9px] text-canopy-muted/50">{new Date(h.appliedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
