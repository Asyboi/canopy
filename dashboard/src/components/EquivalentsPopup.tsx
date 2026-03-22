import { useEffect, useRef, useCallback } from 'react'
import type { Feature } from '../lib/types'
import {
  CARBON_PER_MILE_KG,
  CARBON_PER_PHONE_CHARGE_KG,
  TREE_KG_PER_YEAR,
  HOURS_PER_YEAR,
} from '../lib/constants'

interface Props {
  feature: Feature
  onClose: () => void
}

// ─── CSS animations (injected once per popup mount) ───────────────────────────

const ANIM_STYLES = `
  @keyframes canopy-drive {
    0%   { transform: translateX(-140px); }
    100% { transform: translateX(190px); }
  }
  @keyframes canopy-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes canopy-bolt {
    0%, 100% { opacity: 1;   transform: scale(1); }
    50%       { opacity: 0.3; transform: scale(0.82); }
  }
  @keyframes canopy-battery {
    0%   { transform: scaleY(0.04); }
    100% { transform: scaleY(1); }
  }
  @keyframes canopy-sway {
    0%, 100% { transform: rotate(-5deg); }
    50%       { transform: rotate(5deg); }
  }
  @keyframes canopy-leaf {
    0%   { transform: translate(0px, 0px)   rotate(0deg);  opacity: 0.85; }
    100% { transform: translate(12px, 22px) rotate(55deg); opacity: 0; }
  }
  .canopy-car-body     { animation: canopy-drive   2.4s linear      infinite; }
  .canopy-wheel        { transform-box: fill-box; transform-origin: center;
                         animation: canopy-spin    0.45s linear      infinite; }
  .canopy-bolt         { transform-box: fill-box; transform-origin: center;
                         animation: canopy-bolt    1.2s ease-in-out  infinite; }
  .canopy-battery-fill { transform-box: fill-box; transform-origin: center bottom;
                         animation: canopy-battery 2s   ease-in-out  infinite alternate; }
  .canopy-tree-top     { transform-box: fill-box; transform-origin: center bottom;
                         animation: canopy-sway    3.2s ease-in-out  infinite; }
  .canopy-leaf-1       { animation: canopy-leaf 2.6s ease-in 0s    infinite; }
  .canopy-leaf-2       { animation: canopy-leaf 2.6s ease-in 0.85s infinite; }
  .canopy-leaf-3       { animation: canopy-leaf 2.6s ease-in 1.7s  infinite; }
`

// ─── Animated counter hook ────────────────────────────────────────────────────

function useCounter(target: number, duration = 800) {
  const ref = useRef<HTMLSpanElement>(null)
  const raf = useRef<number>(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const val = target * eased
      el.textContent = val >= 1000
        ? val.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : val.toFixed(val < 10 ? 1 : 0)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return ref
}

// ─── Individual equivalence cards ────────────────────────────────────────────

function CarCard({ carbonKgCo2e }: { carbonKgCo2e: number }) {
  const miles = carbonKgCo2e / CARBON_PER_MILE_KG
  const ref = useCounter(miles)

  return (
    <div className="flex-1 bg-canopy-card border border-canopy-border rounded-xl p-3 flex flex-col items-center gap-2" style={{ minWidth: 150 }}>
      <svg viewBox="0 0 160 100" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'hidden' }}>
        {/* Road */}
        <rect x="0" y="76" width="160" height="24" fill="#1A2822" />
        <rect x="0" y="80" width="160" height="1.5" fill="#7D948A" opacity="0.3" />
        {/* Road dashes */}
        {[4, 44, 84, 124].map((x) => (
          <rect key={x} x={x} y="86" width="22" height="3" fill="#D6B86A" opacity="0.55" rx="1" />
        ))}
        {/* Car group – drives left→right */}
        <g className="canopy-car-body">
          {/* Body */}
          <rect x="24" y="50" width="92" height="28" fill="#3b82f6" rx="5" />
          {/* Roof */}
          <rect x="40" y="33" width="60" height="20" fill="#2563eb" rx="6" />
          {/* Windows */}
          <rect x="44" y="36" width="23" height="14" fill="#bfdbfe" rx="2" opacity="0.9" />
          <rect x="71" y="36" width="23" height="14" fill="#bfdbfe" rx="2" opacity="0.9" />
          {/* Headlight */}
          <rect x="113" y="58" width="7" height="5" fill="#fef08a" rx="1" />
          {/* Front wheel */}
          <circle className="canopy-wheel" cx="92" cy="78" r="10" fill="#111827" stroke="#7D948A" strokeWidth="2" />
          <circle cx="92" cy="78" r="4" fill="#4B5563" />
          {/* Back wheel */}
          <circle className="canopy-wheel" cx="48" cy="78" r="10" fill="#111827" stroke="#7D948A" strokeWidth="2" />
          <circle cx="48" cy="78" r="4" fill="#4B5563" />
        </g>
      </svg>
      <div className="text-center">
        <div className="flex items-baseline gap-0.5 justify-center">
          <span ref={ref} className="text-canopy-accent font-bold text-lg font-mono tabular-nums">0</span>
          <span className="text-canopy-muted text-[10px] ml-1">mi</span>
        </div>
        <p className="text-canopy-muted text-[10px] leading-tight">of driving</p>
      </div>
    </div>
  )
}

function PhoneCard({ carbonKgCo2e }: { carbonKgCo2e: number }) {
  const charges = carbonKgCo2e / CARBON_PER_PHONE_CHARGE_KG
  const ref = useCounter(charges)

  return (
    <div className="flex-1 bg-canopy-card border border-canopy-border rounded-xl p-3 flex flex-col items-center gap-2" style={{ minWidth: 150 }}>
      <svg viewBox="0 0 160 100" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'hidden' }}>
        {/* Phone shell */}
        <rect x="57" y="5" width="46" height="80" fill="#1A2822" rx="9" stroke="#3A4838" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="62" y="13" width="36" height="60" fill="#0B1410" rx="4" />
        {/* Camera notch */}
        <circle cx="80" cy="9" r="2.5" fill="#2A3828" />
        {/* Home bar */}
        <rect x="69" y="79" width="22" height="3" fill="#2A3828" rx="2" />
        {/* Battery outline */}
        <rect x="68" y="20" width="24" height="42" fill="none" stroke="#3FAF74" strokeWidth="2" rx="3" />
        {/* Battery tip */}
        <rect x="74" y="17" width="12" height="4" fill="#3FAF74" rx="2" />
        {/* Battery fill – animated scale from bottom */}
        <rect className="canopy-battery-fill" x="70.5" y="22.5" width="19" height="38" fill="#3FAF74" rx="2" opacity="0.85" />
        {/* Lightning bolt */}
        <path
          className="canopy-bolt"
          d="M84 26 L75 43 L81 43 L76 56 L87 37 L81 37 Z"
          fill="#fef08a"
        />
        {/* USB cable */}
        <rect x="78" y="85" width="4" height="8" fill="#2A3828" rx="1" />
        <rect x="69" y="93" width="22" height="4" fill="#1A2822" rx="2" />
      </svg>
      <div className="text-center">
        <div className="flex items-baseline gap-0.5 justify-center">
          <span ref={ref} className="text-canopy-accent font-bold text-lg font-mono tabular-nums">0</span>
          <span className="text-canopy-muted text-[10px] ml-1">ch</span>
        </div>
        <p className="text-canopy-muted text-[10px] leading-tight">phone charges</p>
      </div>
    </div>
  )
}

function TreeCard({ carbonKgCo2e }: { carbonKgCo2e: number }) {
  const treeHours = carbonKgCo2e / (TREE_KG_PER_YEAR / HOURS_PER_YEAR)
  const ref = useCounter(treeHours)

  return (
    <div className="flex-1 bg-canopy-card border border-canopy-border rounded-xl p-3 flex flex-col items-center gap-2" style={{ minWidth: 150 }}>
      <svg viewBox="0 0 160 100" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'hidden' }}>
        {/* Ground shadow */}
        <ellipse cx="80" cy="96" rx="22" ry="4" fill="#92400e" opacity="0.3" />
        {/* Trunk */}
        <rect x="74" y="68" width="12" height="28" fill="#92400e" rx="3" />
        {/* Tree canopy – sways gently */}
        <g className="canopy-tree-top">
          <ellipse cx="80" cy="62" rx="30" ry="20" fill="#16a34a" />
          <ellipse cx="80" cy="46" rx="24" ry="19" fill="#15803d" />
          <ellipse cx="80" cy="30" rx="16" ry="14" fill="#166534" />
        </g>
        {/* Falling leaves */}
        <rect className="canopy-leaf-1" x="95" y="46" width="7" height="4" fill="#4ade80" rx="2" opacity="0.85" />
        <rect className="canopy-leaf-2" x="100" y="36" width="6" height="4" fill="#86efac" rx="2" opacity="0.85" />
        <rect className="canopy-leaf-3" x="90" y="28" width="6" height="4" fill="#4ade80" rx="2" opacity="0.85" />
      </svg>
      <div className="text-center">
        <div className="flex items-baseline gap-0.5 justify-center">
          <span ref={ref} className="text-canopy-accent font-bold text-lg font-mono tabular-nums">0</span>
          <span className="text-canopy-muted text-[10px] ml-1">hrs</span>
        </div>
        <p className="text-canopy-muted text-[10px] leading-tight">of tree absorption</p>
      </div>
    </div>
  )
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES = {
  high:   'text-tier-high bg-tier-high-bg border-tier-high/40',
  medium: 'text-tier-medium bg-tier-medium-bg border-tier-medium/40',
  low:    'text-tier-low bg-tier-low-bg border-tier-low/40',
} as const

// ─── Main popup ───────────────────────────────────────────────────────────────

export default function EquivalentsPopup({ feature, onClose }: Props) {
  const { sustainability, sci, sustainabilityTier } = feature

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(11,20,16,0.75)' }}
      onClick={onClose}
    >
      <style>{ANIM_STYLES}</style>
      <div
        className="animate-fade-up bg-canopy-surface border border-canopy-border rounded-2xl shadow-2xl w-full"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-canopy-border">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-canopy-text font-semibold text-sm">{feature.name}</p>
              <span className={`text-[9px] font-medium uppercase tracking-wider border rounded px-1.5 py-0.5 ${TIER_STYLES[sustainabilityTier]}`}>
                {sustainabilityTier} impact
              </span>
            </div>
            <p className="text-canopy-accent font-mono text-xs mt-0.5">
              ~{sci.sciGco2PerR.toFixed(1)} gCO₂/day SCI
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-canopy-muted hover:text-canopy-text transition-colors text-lg leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Equivalents */}
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-canopy-muted mb-3">
            Monthly carbon equivalent to…
          </p>
          <div className="flex gap-2">
            <CarCard   carbonKgCo2e={sustainability.carbonKgCo2e} />
            <PhoneCard carbonKgCo2e={sustainability.carbonKgCo2e} />
            <TreeCard  carbonKgCo2e={sustainability.carbonKgCo2e} />
          </div>
        </div>

        {/* SCI breakdown footer */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          <div className="h-px bg-canopy-border" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sci-e text-[10px] font-mono font-bold">E</span>
              <span className="text-canopy-muted text-[10px] tabular-nums font-mono">
                {sci.e_kwhPerR.toFixed(5)} kWh/day
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sci-i text-[10px] font-mono font-bold">I</span>
              <span className="text-canopy-muted text-[10px] tabular-nums font-mono">
                {sci.i_gco2PerKwh} gCO₂/kWh
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sci-m text-[10px] font-mono font-bold">M</span>
              <span className="text-canopy-muted text-[10px] tabular-nums font-mono">
                ~{sci.m_gco2PerR.toFixed(2)} gCO₂/day
              </span>
            </div>
          </div>
          <p className="text-[9px] text-canopy-muted/50 mt-0.5">
            Confidence: {sci.confidence} · Estimated via proxy model
          </p>
        </div>
      </div>
    </div>
  )
}
