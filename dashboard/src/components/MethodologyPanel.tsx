function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-canopy-border/40 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] text-canopy-muted font-mono">{label}</span>
        <span className="text-[10px] text-canopy-secondary font-mono text-right">{value}</span>
      </div>
      {note && (
        <span className="text-[9px] text-canopy-muted/50">{note}</span>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-canopy-card border border-canopy-border rounded-lg p-2.5">
      <p className="text-[9px] uppercase tracking-widest text-canopy-muted mb-1.5">{title}</p>
      {children}
    </div>
  )
}

export default function MethodologyPanel() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-canopy-text text-xs font-semibold">Measurement Methodology</p>
        <p className="text-[10px] text-canopy-muted mt-0.5">
          SCI-lite — static proxy model based on code structure. No runtime benchmark.
        </p>
      </div>

      <Section title="SCI Formula">
        <Row label="Formula" value="SCI = (E × I) + M  per R" />
        <Row label="Confidence" value="low" note="Static analysis only — no runtime instrumentation" />
      </Section>

      <Section title="Energy Model (E)">
        <Row label="Base energy" value="5 kWh / 100 LOC / mo" note="Proxy for compute footprint" />
        <Row label="Complexity factor" value="cyclomatic × 0.1 kWh" />
        <Row label="Dependency factor" value="deps × 0.05 kWh" />
        <Row label="PUE" value="1.16" note="Azure US West average" />
      </Section>

      <Section title="Carbon Intensity (I)">
        <Row label="Grid carbon intensity" value="388 gCO₂/kWh" note="US average — Green Software Foundation" />
      </Section>

      <Section title="Embodied Emissions (M)">
        <Row label="Server embodied" value="1,230 kgCO₂" note="Manufacturing + end-of-life" />
        <Row label="Lifespan" value="4 years" />
        <Row label="Resource share" value="25%" note="Fraction attributable to this workload" />
        <Row label="M per day" value="~0.21 gCO₂/day per feature" />
      </Section>

      <Section title="Water (WUE)">
        <Row label="Water use efficiency" value="0.27 L/kWh" note="Azure US West average" />
      </Section>

      <Section title="Functional Unit (R)">
        <Row label="R" value="1 day of operation" note="All SCI values are per-day" />
      </Section>

      <Section title="Tier Thresholds">
        <Row label="High impact" value="≥ 120 gCO₂/day" />
        <Row label="Medium impact" value="40–119 gCO₂/day" />
        <Row label="Low impact" value="&lt; 40 gCO₂/day" />
      </Section>

      <Section title="References">
        <div className="flex flex-col gap-0.5">
          <p className="text-[9px] text-canopy-muted/60">Green Software Foundation — SCI Specification v1</p>
          <p className="text-[9px] text-canopy-muted/60">EPA — Greenhouse Gas Equivalencies Calculator</p>
          <p className="text-[9px] text-canopy-muted/60">Microsoft Azure — Sustainability Calculator</p>
        </div>
      </Section>
    </div>
  )
}
