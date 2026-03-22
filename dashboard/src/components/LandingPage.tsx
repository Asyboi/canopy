import { useEffect, useRef, useState } from 'react'
import Globe from './Globe'

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  useEffect(() => {
    if (prefersReduced) { setVisible(true); return }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.10 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [prefersReduced])

  return { ref, visible }
}

// ── Primitives ────────────────────────────────────────────────────────────────

function RevealSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <section
      id={id}
      ref={ref as React.RefObject<HTMLElement>}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-canopy-accent mb-3">
      <span className="text-[6px] opacity-60">●</span>
      {children}
    </p>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-[1.85rem] font-semibold text-canopy-text leading-tight tracking-tight">
      {children}
    </h2>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-canopy-bg/92 backdrop-blur-md border-b border-canopy-border shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M11 2C6.5 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L11 20l5.4-2.5C18 15.8 19 13.5 19 11c0-5-3.5-9-8-9z"
              fill="#3FAF74"
              opacity="0.9"
            />
            <path d="M11 6v8M8 9l3-3 3 3" stroke="#0B1410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold text-canopy-text tracking-tight text-[15px] letter-spacing-tight">canopy</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7 text-[13px] text-canopy-secondary">
          {(['#features', '#how-it-works', '#sci', '#why'] as const).map((href, i) => (
            <a
              key={href}
              href={href}
              className="hover:text-canopy-text transition-colors duration-200"
            >
              {['Features', 'How It Works', 'Methodology', 'Why It Matters'][i]}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="https://marketplace.visualstudio.com"
            className="hidden sm:block text-[13px] text-canopy-muted hover:text-canopy-secondary transition-colors duration-200"
          >
            Extension ↗
          </a>
          <a
            href="#hero"
            className="text-[13px] font-medium px-4 py-1.5 rounded-md bg-canopy-accent text-canopy-bg hover:bg-canopy-accent/90 transition-all duration-200 hover:shadow-md hover:shadow-canopy-accent/20"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-canopy-bg"
    >
      {/* Layered background depth */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base: subtle green-right ambient */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 68% 52%, rgba(63,175,116,0.06) 0%, transparent 65%)' }} />
        {/* Top-left vignette for depth */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(0,0,0,0.25) 0%, transparent 60%)' }} />
        {/* Bottom edge darkening */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, rgba(11,20,16,0.6) 0%, transparent 100%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-center">

          {/* Left: copy */}
          <div className="flex flex-col gap-7 animate-fade-up">
            {/* Eyebrow */}
            <p className="text-[10.5px] font-mono uppercase tracking-[0.24em] text-canopy-accent/90">
              Software Carbon Intensity · Developer Tooling
            </p>

            {/* Headline */}
            <h1 className="text-[2.5rem] md:text-[3.1rem] font-bold text-canopy-text leading-[1.08] tracking-tight">
              Every feature has an{' '}
              <span
                className="text-canopy-accent"
                style={{ textShadow: '0 0 40px rgba(63,175,116,0.25)' }}
              >
                environmental cost.
              </span>
              <br />
              Now you can quantify it.
            </h1>

            {/* Subheadline */}
            <p className="text-[15px] text-canopy-secondary leading-[1.7] max-w-[440px]">
              Canopy brings Software Carbon Intensity into the development workflow.
              Analyze your codebase feature by feature. See where energy goes.
              Ship greener code.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <a
                href="https://marketplace.visualstudio.com"
                className="px-6 py-2.5 rounded-lg bg-canopy-accent text-canopy-bg font-semibold text-[14px] hover:bg-canopy-accent/90 transition-all duration-200 hover:shadow-lg hover:shadow-canopy-accent/25 active:scale-[0.97]"
              >
                Install for VS Code
              </a>
              <a
                href="/dashboard"
                className="px-6 py-2.5 rounded-lg border border-canopy-border text-canopy-secondary text-[14px] hover:border-canopy-accent/35 hover:text-canopy-text transition-all duration-200 hover:bg-canopy-surface/40"
              >
                View Dashboard →
              </a>
            </div>

            {/* SCI formula trust line — colored components */}
            <div className="flex items-center gap-3 pt-0.5">
              <div className="w-6 h-px bg-canopy-border" />
              <div>
                <div className="flex items-center gap-0.5 font-mono text-[12px]">
                  <span className="text-canopy-muted">SCI = ((</span>
                  <span className="text-sci-e">E</span>
                  <span className="text-canopy-muted"> × </span>
                  <span className="text-sci-i">I</span>
                  <span className="text-canopy-muted">) + </span>
                  <span className="text-sci-m">M</span>
                  <span className="text-canopy-muted">) / </span>
                  <span className="text-sci-r">R</span>
                </div>
                <p className="text-[10px] text-canopy-muted/60 mt-0.5 font-mono">
                  Green Software Foundation · SCI Specification v1
                </p>
              </div>
            </div>
          </div>

          {/* Right: Globe */}
          <div className="flex items-center justify-center relative">
            {/* Outer halo */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '640px', height: '640px',
                background: 'radial-gradient(circle, rgba(63,175,116,0.04) 0%, transparent 68%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Inner halo */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '420px', height: '420px',
                background: 'radial-gradient(circle, rgba(63,175,116,0.07) 0%, transparent 70%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              }}
            />
            <Globe
              className="relative z-10 w-full"
              style={{
                maxWidth: '500px',
                aspectRatio: '1',
                filter: 'drop-shadow(0 0 48px rgba(63,175,116,0.10))',
              } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator — bounces */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-canopy-muted/60"
        style={{ animation: 'hero-scroll-bounce 2s ease-in-out infinite' }}
      >
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]">Scroll</span>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
          <path d="M5 1v10M1 8l4 4 4-4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @keyframes hero-scroll-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(5px); }
        }
      `}</style>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function FeatureCard({
  label,
  title,
  description,
  accentColor,
}: {
  label: string
  title: string
  description: string
  accentColor: string
}) {
  return (
    <div className="relative bg-canopy-card border border-canopy-border rounded-xl p-6 flex flex-col gap-3 overflow-hidden group hover:border-canopy-accent/30 hover:bg-canopy-surface/50 transition-all duration-300">
      <div className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${accentColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-canopy-muted">{label}</p>
      <h3 className="text-[14.5px] font-semibold text-canopy-text leading-snug">{title}</h3>
      <p className="text-[13px] text-canopy-secondary leading-relaxed">{description}</p>
    </div>
  )
}

function Features() {
  return (
    <RevealSection id="features" className="py-24 bg-canopy-surface">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12 max-w-xl">
          <SectionLabel>What Canopy Does</SectionLabel>
          <SectionHeading>Sustainability visibility, built for engineering teams</SectionHeading>
          <p className="mt-4 text-[14px] text-canopy-secondary leading-relaxed">
            Not guesswork. Feature-level SCI scores rooted in the Green Software Foundation specification.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            label="01 / Analyze"
            title="Feature-level segmentation"
            description="Canopy parses your dependency graph and co-change history, then segments your codebase into logical features — each scored independently."
            accentColor="bg-canopy-accent"
          />
          <FeatureCard
            label="02 / Quantify"
            title="SCI scoring per feature"
            description="Every feature receives a full SCI breakdown: E, I, M, and R — computed from static analysis, displayed without guesswork."
            accentColor="bg-sci-e"
          />
          <FeatureCard
            label="03 / Act"
            title="AI-driven green suggestions"
            description="Claude identifies inefficiency patterns and proposes targeted refactors. Preview the diff, see the projected SCI delta, apply from the extension."
            accentColor="bg-tier-low"
          />
        </div>
      </div>
    </RevealSection>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────
function Step({
  number,
  title,
  description,
  prompt,
  code,
}: {
  number: string
  title: string
  description: string
  prompt?: string
  code?: string
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-canopy-accent/10 border border-canopy-accent/35 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-mono font-bold text-canopy-accent">{number}</span>
        </div>
        <div className="flex-1 w-px bg-canopy-border/60 mt-2" />
      </div>
      <div className="pb-10 flex-1">
        <h3 className="text-[13.5px] font-semibold text-canopy-text mb-1.5">{title}</h3>
        <p className="text-[13px] text-canopy-secondary leading-relaxed mb-3">{description}</p>
        {code && (
          <pre className="bg-canopy-card border border-canopy-border rounded-lg px-4 py-3 text-[12px] font-mono overflow-x-auto">
            <span className="text-canopy-accent/50 select-none">{prompt ?? '$ '}</span>
            <span className="text-canopy-accent/90">{code}</span>
          </pre>
        )}
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <RevealSection id="how-it-works" className="py-24 bg-canopy-bg">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <SectionLabel>How It Works</SectionLabel>
            <SectionHeading>From codebase to carbon score in minutes</SectionHeading>
            <p className="mt-4 text-[14px] text-canopy-secondary leading-relaxed">
              Canopy runs entirely on your machine. No cloud. No data egress.
              Analysis uses static analysis — no runtime instrumentation required.
            </p>
          </div>

          <div className="mt-2">
            <Step
              number="01"
              title="Start the analysis server"
              description="A lightweight local server powers the analysis pipeline."
              code="canopy-server"
            />
            <Step
              number="02"
              title="Open VS Code with the extension"
              description="Install the Canopy extension. It activates on open and triggers the initial workspace analysis."
            />
            <Step
              number="03"
              title="Review the codebase map"
              description="Features appear in the dependency map, each scored by complexity, energy estimate, and SCI tier. High-impact areas surface first."
            />
            <Step
              number="04"
              title="Apply greener suggestions"
              description="The extension surfaces targeted suggestions with savings estimates. Preview diffs inline. Track applied changes in the dashboard history."
            />
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

// ── SCI Section ───────────────────────────────────────────────────────────────
function SciComponent({
  letter,
  name,
  description,
  color,
  detail,
}: {
  letter: string
  name: string
  description: string
  color: string
  detail: string
}) {
  return (
    <div className="bg-canopy-card border border-canopy-border rounded-xl p-5 flex flex-col gap-2 hover:border-canopy-accent/25 transition-colors duration-300">
      <div className="flex items-baseline gap-2">
        <span className={`text-[1.6rem] font-bold font-mono leading-none ${color}`}>{letter}</span>
        <span className="text-[11px] text-canopy-muted font-mono">{name}</span>
      </div>
      <p className="text-[13px] text-canopy-text font-medium leading-snug">{description}</p>
      <p className="text-[12px] text-canopy-secondary leading-relaxed">{detail}</p>
    </div>
  )
}

function SciSection() {
  return (
    <RevealSection id="sci" className="py-24 bg-canopy-surface">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <SectionLabel>Methodology</SectionLabel>
          <SectionHeading>Built on the SCI specification</SectionHeading>
          <p className="mt-4 text-[14px] text-canopy-secondary max-w-md mx-auto leading-relaxed">
            A rigorous, vendor-neutral standard for expressing the real carbon cost of software — per feature, per functional unit.
          </p>
        </div>

        {/* Formula — with proper grouping */}
        <div className="flex justify-center mb-12">
          <div className="bg-canopy-bg border border-canopy-border rounded-2xl px-10 py-8 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-canopy-muted mb-5">
              SCI Formula
            </p>
            <div className="text-[2.2rem] md:text-[2.8rem] font-mono font-bold tracking-tight leading-none">
              <span className="text-canopy-muted/60">(</span>
              <span className="text-canopy-muted/60">(</span>
              <span className="text-sci-e">E</span>
              <span className="text-canopy-muted/70 mx-1.5 font-light text-[1.8rem]">×</span>
              <span className="text-sci-i">I</span>
              <span className="text-canopy-muted/60">)</span>
              <span className="text-canopy-muted/70 mx-2 font-light text-[1.8rem]">+</span>
              <span className="text-sci-m">M</span>
              <span className="text-canopy-muted/60">)</span>
              <span className="text-canopy-muted/70 mx-2 font-light text-[1.8rem]">/</span>
              <span className="text-sci-r">R</span>
            </div>
            <p className="text-[11px] font-mono text-canopy-muted/60 mt-4 tracking-wide">
              software carbon intensity per functional unit
            </p>
          </div>
        </div>

        {/* Component cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SciComponent
            letter="E"
            name="Energy"
            description="Energy consumed per functional unit"
            detail="Estimated from LOC, cyclomatic complexity, and dependency depth. Proxy for compute footprint."
            color="text-sci-e"
          />
          <SciComponent
            letter="I"
            name="Carbon Intensity"
            description="Grid carbon intensity in gCO₂/kWh"
            detail="436 gCO₂/kWh IEA global average. Configurable per deployment region."
            color="text-sci-i"
          />
          <SciComponent
            letter="M"
            name="Embodied Emissions"
            description="Hardware manufacturing and end-of-life"
            detail="Amortized across hardware lifespan and workload share. Configurable in .canopy/config.json."
            color="text-sci-m"
          />
          <SciComponent
            letter="R"
            name="Functional Unit"
            description="The unit that normalizes the score"
            detail="Default: per 1,000 API requests. Configurable to match your system's real functional unit."
            color="text-sci-r"
          />
        </div>

        {/* Note */}
        <div className="border-l border-canopy-accent/30 pl-4 max-w-2xl mx-auto">
          <p className="text-[12px] text-canopy-secondary leading-relaxed">
            <span className="font-mono text-canopy-muted">SCI-lite</span> — Canopy uses static analysis
            as a proxy model. No runtime instrumentation required. Confidence is clearly labeled as estimated.
          </p>
          <p className="text-[11px] text-canopy-muted/60 mt-1.5">
            Green Software Foundation SCI Specification v1 · IEA Global Energy Review 2023
          </p>
        </div>
      </div>
    </RevealSection>
  )
}

// ── Product Preview ───────────────────────────────────────────────────────────
function MockFeatureItem({
  name,
  tier,
  sci,
  suggestions,
  selected,
}: {
  name: string
  tier: 'high' | 'medium' | 'low'
  sci: string
  suggestions?: number
  selected?: boolean
}) {
  const tierColors = {
    high: { dot: 'bg-tier-high', text: 'text-tier-high' },
    medium: { dot: 'bg-tier-medium', text: 'text-tier-medium' },
    low: { dot: 'bg-tier-low', text: 'text-tier-low' },
  }
  const c = tierColors[tier]

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
      selected ? 'bg-canopy-surface' : 'hover:bg-canopy-surface/60'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className="flex-1 text-[12px] text-canopy-text font-mono truncate">{name}</span>
      {suggestions && (
        <span className="text-[9px] bg-canopy-accent text-canopy-bg rounded-full w-4 h-4 flex items-center justify-center font-bold flex-shrink-0">
          {suggestions}
        </span>
      )}
      <span className={`text-[10px] font-mono ${c.text} flex-shrink-0`}>{sci}</span>
    </div>
  )
}

function MockGraphNode({ x, y, r, tier }: { x: number; y: number; r: number; tier: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: { fill: 'rgba(217,122,95,0.15)', stroke: '#D97A5F' },
    medium: { fill: 'rgba(214,184,106,0.15)', stroke: '#D6B86A' },
    low: { fill: 'rgba(79,203,130,0.15)', stroke: '#4FCB82' },
  }
  const c = colors[tier]
  return <circle cx={x} cy={y} r={r} fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
}

const PANEL_SHADOW = '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(63,175,116,0.06)'

function ProductPreview() {
  return (
    <RevealSection className="py-24 bg-canopy-bg">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <SectionLabel>The Product</SectionLabel>
          <SectionHeading>Extension and dashboard, working together</SectionHeading>
          <p className="mt-4 text-[14px] text-canopy-secondary max-w-md mx-auto leading-relaxed">
            The extension is where you act. The dashboard is where you track.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Extension mock */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-canopy-muted px-1">
              VS Code Extension
            </p>
            <div
              className="bg-[#0c1812] border border-canopy-border rounded-xl overflow-hidden"
              style={{ boxShadow: PANEL_SHADOW }}
            >
              {/* Titlebar */}
              <div className="bg-canopy-surface border-b border-canopy-border px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[11px] text-canopy-muted/80 font-mono mx-auto">CANOPY — Codebase Features</span>
              </div>
              {/* Feature list */}
              <div className="p-2 flex flex-col gap-0.5">
                <div className="px-3 py-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-canopy-muted/50">
                    6 features · 3 pending fixes
                  </span>
                </div>
                <MockFeatureItem name="auth/middleware" tier="high" sci="247 gCO₂" suggestions={3} selected />
                <MockFeatureItem name="api/graphql-resolver" tier="high" sci="198 gCO₂" suggestions={2} />
                <MockFeatureItem name="search/elastic-client" tier="medium" sci="94 gCO₂" suggestions={1} />
                <MockFeatureItem name="cache/redis-adapter" tier="medium" sci="67 gCO₂" />
                <MockFeatureItem name="utils/formatters" tier="low" sci="12 gCO₂" />
                <MockFeatureItem name="config/env-loader" tier="low" sci="8 gCO₂" />

                {/* Suggestion panel */}
                <div className="mt-3 mx-1 bg-canopy-card border border-canopy-border rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9.5px] font-mono uppercase tracking-wider text-canopy-accent">
                      Suggestion · auth/middleware
                    </p>
                    <span className="text-[9px] font-mono text-canopy-muted bg-canopy-surface px-1.5 py-0.5 rounded">−18% SCI</span>
                  </div>
                  <p className="text-[11px] text-canopy-secondary leading-relaxed">
                    Replace synchronous bcrypt loops with async hashing to eliminate blocking I/O.
                  </p>
                  <div className="flex gap-2 mt-0.5">
                    <button className="flex-1 text-[11px] bg-canopy-accent text-canopy-bg py-1.5 rounded font-semibold hover:bg-canopy-accent/90 transition-colors">
                      Apply Fix
                    </button>
                    <button className="text-[11px] border border-canopy-border text-canopy-muted px-3 py-1.5 rounded hover:border-canopy-accent/20 transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-canopy-muted px-1">
              Web Dashboard
            </p>
            <div
              className="bg-[#0c1812] border border-canopy-border rounded-xl overflow-hidden"
              style={{ boxShadow: PANEL_SHADOW }}
            >
              {/* Titlebar */}
              <div className="bg-canopy-surface border-b border-canopy-border px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[11px] text-canopy-muted/80 font-mono mx-auto">Canopy Dashboard</span>
              </div>

              {/* SCI Hero strip */}
              <div className="bg-canopy-surface border-b border-canopy-border px-4 py-3 flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-canopy-muted mb-0.5">SCI Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.6rem] font-bold font-mono text-canopy-accent leading-none">~628</span>
                    <span className="text-[11px] text-canopy-muted">gCO₂/day</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-canopy-border" />
                <div className="flex gap-5">
                  {([['E', '0.0142 kWh', 'text-sci-e'], ['I', '436 gCO₂/kWh', 'text-sci-i'], ['M', '~1.4 gCO₂', 'text-sci-m']] as const).map(([l, v, c]) => (
                    <div key={l}>
                      <p className={`text-[9px] font-mono font-bold ${c}`}>{l}</p>
                      <p className="text-[10px] font-mono text-canopy-secondary">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph area */}
              <div className="p-4" style={{ height: '210px' }}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-canopy-muted mb-2">
                  Codebase Map
                </p>
                <svg width="100%" height="166" viewBox="0 0 400 166" style={{ overflow: 'visible' }}>
                  {/* Edges */}
                  <line x1="200" y1="83" x2="120" y2="40" stroke="rgba(120,170,145,0.18)" strokeWidth="1" />
                  <line x1="200" y1="83" x2="290" y2="42" stroke="rgba(120,170,145,0.18)" strokeWidth="1" />
                  <line x1="200" y1="83" x2="110" y2="135" stroke="rgba(120,170,145,0.18)" strokeWidth="1" />
                  <line x1="200" y1="83" x2="308" y2="126" stroke="rgba(120,170,145,0.18)" strokeWidth="1" />
                  <line x1="120" y1="40" x2="55" y2="75" stroke="rgba(120,170,145,0.12)" strokeWidth="1" />
                  <line x1="290" y1="42" x2="348" y2="72" stroke="rgba(120,170,145,0.12)" strokeWidth="1" />
                  {/* Nodes */}
                  <MockGraphNode x={200} y={83} r={22} tier="high" />
                  <MockGraphNode x={120} y={40} r={18} tier="high" />
                  <MockGraphNode x={290} y={42} r={14} tier="medium" />
                  <MockGraphNode x={110} y={135} r={12} tier="low" />
                  <MockGraphNode x={308} y={126} r={10} tier="low" />
                  <MockGraphNode x={55} y={75} r={8} tier="medium" />
                  <MockGraphNode x={348} y={72} r={9} tier="low" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  )
}

// ── Why It Matters ────────────────────────────────────────────────────────────
function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-7 h-[2px] bg-canopy-accent/70 rounded" />
      <h3 className="text-[14.5px] font-semibold text-canopy-text leading-snug">{title}</h3>
      <p className="text-[13px] text-canopy-secondary leading-relaxed">{body}</p>
    </div>
  )
}

function WhyItMatters() {
  return (
    <RevealSection id="why" className="py-24 bg-canopy-surface">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <SectionLabel>Why It Matters</SectionLabel>
          <SectionHeading>Engineering decisions have environmental consequences</SectionHeading>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          <WhyCard
            title="Software isn't free to run"
            body="Every feature consumes energy, generates heat, and wears out hardware. Most engineering teams have zero visibility into this. Canopy makes it legible."
          />
          <WhyCard
            title="A third engineering signal"
            body="Teams already optimize for performance and cost. Sustainability is the missing signal — and it belongs inside the same tools, not in a separate dashboard."
          />
          <WhyCard
            title="What gets measured gets managed"
            body="Canopy makes environmental impact a first-class metric: visible in the editor, tracked in the dashboard, improving with every applied suggestion."
          />
        </div>
      </div>
    </RevealSection>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCta() {
  return (
    <RevealSection className="py-28 bg-canopy-bg relative overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(63,175,116,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(63,175,116,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Radial glow over grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(63,175,116,0.11) 0%, rgba(11,20,16,0.9) 65%, #0B1410 100%)',
        }}
      />

      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        <p className="inline-flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.2em] text-canopy-accent mb-6">
          <span className="text-[6px] opacity-60">●</span>
          Get Started
        </p>
        <h2 className="text-[2.4rem] md:text-[3rem] font-bold text-canopy-text leading-[1.08] mb-5 tracking-tight">
          Start measuring.
          <br />
          Start improving.
        </h2>
        <p className="text-[14px] text-canopy-secondary leading-relaxed mb-8 max-w-sm mx-auto">
          Runs locally. No cloud. No telemetry.
          Your first SCI score in under a minute.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://marketplace.visualstudio.com"
            className="px-7 py-3 rounded-lg bg-canopy-accent text-canopy-bg font-semibold text-[14px] hover:bg-canopy-accent/90 transition-all duration-200 hover:shadow-xl hover:shadow-canopy-accent/25 active:scale-[0.97]"
          >
            Install for VS Code
          </a>
          <a
            href="#sci"
            className="px-7 py-3 rounded-lg border border-canopy-border text-canopy-secondary text-[14px] hover:border-canopy-accent/35 hover:text-canopy-text hover:bg-canopy-surface/40 transition-all duration-200"
          >
            Read the Methodology
          </a>
        </div>

        <p className="mt-7 text-[10.5px] font-mono text-canopy-muted/60 tracking-wide">
          Local analysis · No data sent externally · Open methodology
        </p>
      </div>
    </RevealSection>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-canopy-surface border-t border-canopy-border py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <svg width="17" height="17" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M11 2C6.5 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L11 20l5.4-2.5C18 15.8 19 13.5 19 11c0-5-3.5-9-8-9z" fill="#3FAF74" opacity="0.8" />
                <path d="M11 6v8M8 9l3-3 3 3" stroke="#0B1410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-semibold text-canopy-text text-[14px] tracking-tight">canopy</span>
            </div>
            <p className="text-[11px] text-canopy-muted">Built for engineers who care about systems.</p>
          </div>

          <div className="flex flex-wrap gap-6 text-[12px] text-canopy-muted">
            <a href="#sci" className="hover:text-canopy-secondary transition-colors">Methodology</a>
            <a href="https://github.com" className="hover:text-canopy-secondary transition-colors">GitHub</a>
            <a href="https://marketplace.visualstudio.com" className="hover:text-canopy-secondary transition-colors">VS Code Marketplace</a>
          </div>

          <p className="text-[11px] text-canopy-muted/50">© 2025 Canopy</p>
        </div>
      </div>
    </footer>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canopy-bg text-canopy-text overflow-x-hidden">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <SciSection />
      <ProductPreview />
      <WhyItMatters />
      <FinalCta />
      <Footer />
    </div>
  )
}
