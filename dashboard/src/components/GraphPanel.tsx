import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { AnalysisResult, Feature } from '../lib/types'
import { PATTERN_LABELS } from '../lib/constants'

interface Props {
  analysis: AnalysisResult
  selectedFeatureId: string | null
  onSelectFeature: (id: string) => void
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  feature: Feature
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  kind: 'hard' | 'soft'
}

interface TooltipState {
  x: number
  y: number
  feature: Feature
}

const TIER_STROKE: Record<Feature['sustainabilityTier'], string> = {
  high:   '#D97A5F',
  medium: '#D6B86A',
  low:    '#4FCB82',
}

const TIER_FILL: Record<Feature['sustainabilityTier'], string> = {
  high:   'rgba(217,122,95,0.12)',
  medium: 'rgba(214,184,106,0.12)',
  low:    'rgba(79,203,130,0.12)',
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

function nodeRadius(feature: Feature): number {
  return clamp(feature.metrics.complexityScore * 30 + 12, 12, 38)
}

function buildGraph(analysis: AnalysisResult): { nodes: GraphNode[]; links: GraphLink[] } {
  const featureIds = new Set(analysis.features.map((f) => f.id))
  const nodes: GraphNode[] = analysis.features.map((f) => ({ id: f.id, feature: f }))
  const links: GraphLink[] = []
  const hardPairs = new Set<string>()

  // Hard links: explicit code dependency (feature A imports feature B's files)
  for (const f of analysis.features) {
    for (const depId of f.dependencies ?? []) {
      if (featureIds.has(depId) && depId !== f.id) {
        links.push({ source: f.id, target: depId, kind: 'hard' })
        hardPairs.add(`${f.id}__${depId}`)
        hardPairs.add(`${depId}__${f.id}`)
      }
    }
  }

  // Soft links: features sharing a common subdirectory (e.g. src/auth, src/api)
  function subdirs(files: string[]): Set<string> {
    const s = new Set<string>()
    for (const file of files) {
      const parts = file.split('/')
      if (parts.length >= 2) s.add(parts[0] + '/' + parts[1])
      else s.add(parts[0])
    }
    return s
  }

  const dirs = analysis.features.map((f) => ({ id: f.id, dirs: subdirs(f.files) }))
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const a = dirs[i], b = dirs[j]
      if (hardPairs.has(`${a.id}__${b.id}`)) continue
      const shared = [...a.dirs].some((d) => b.dirs.has(d))
      if (shared) links.push({ source: a.id, target: b.id, kind: 'soft' })
    }
  }

  return { nodes, links }
}

export default function GraphPanel({ analysis, selectedFeatureId, onSelectFeature }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Re-apply selection ring without rebuilding the whole simulation
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    d3.select(svg).selectAll<SVGCircleElement, GraphNode>('circle.node-ring')
      .attr('stroke-width', (d) => d.id === selectedFeatureId ? 3.5 : 2)
      .attr('stroke-opacity', (d) => d.id === selectedFeatureId ? 1 : 0.9)
  }, [selectedFeatureId])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const width = rect.width || 800
    const height = rect.height || 600

    const { nodes, links } = buildGraph(analysis)

    for (const node of nodes) {
      const saved = nodePositions.current.get(node.id)
      if (saved) {
        node.x = saved.x
        node.y = saved.y
      } else {
        node.x = width / 2 + (Math.random() - 0.5) * 80
        node.y = height / 2 + (Math.random() - 0.5) * 80
      }
    }

    const d3svg = d3.select(svg)
    d3svg.selectAll('*').remove()

    const g = d3svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    d3svg.call(zoom)

    // Arrow marker
    d3svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'rgba(120,170,145,0.3)')

    // Hard dependency links — solid, directional
    const hardLink = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links.filter((l) => l.kind === 'hard'))
      .join('line')
      .attr('stroke', 'rgba(120,170,145,0.7)')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

    // Soft proximity links — dashed, undirected
    const softLink = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links.filter((l) => l.kind === 'soft'))
      .join('line')
      .attr('stroke', 'rgba(184,200,192,0.25)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')

    // Node groups
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .style('cursor', 'pointer')

    // Selection glow ring (outer, shown for selected node)
    nodeGroup.append('circle')
      .attr('class', 'node-glow')
      .attr('r', (d) => nodeRadius(d.feature) + 6)
      .attr('fill', 'none')
      .attr('stroke', (d) => TIER_STROKE[d.feature.sustainabilityTier])
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0)
      .attr('opacity', (d) => d.id === selectedFeatureId ? 0.5 : 0)

    // Main circle
    nodeGroup.append('circle')
      .attr('class', 'node-ring')
      .attr('r', (d) => nodeRadius(d.feature))
      .attr('fill', (d) => TIER_FILL[d.feature.sustainabilityTier])
      .attr('stroke', (d) => TIER_STROKE[d.feature.sustainabilityTier])
      .attr('stroke-width', (d) => d.id === selectedFeatureId ? 3.5 : 2)
      .attr('stroke-opacity', (d) => d.id === selectedFeatureId ? 1 : 0.9)

    // Feature name label
    nodeGroup.append('text')
      .text((d) => {
        const name = d.feature.name
        return name.length > 16 ? name.slice(0, 14) + '…' : name
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeRadius(d.feature) + 13)
      .attr('fill', '#B8C8C0')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .style('pointer-events', 'none')

    // Suggestion count badge
    nodeGroup.each(function(d) {
      const pendingCount = d.feature.suggestions.filter((s) => s.status === 'suggested').length
      if (pendingCount === 0) return
      const r = nodeRadius(d.feature)
      const group = d3.select(this)
      const badgeGroup = group.append('g').attr('transform', `translate(${r * 0.65}, ${-r * 0.65})`)
      badgeGroup.append('circle')
        .attr('r', 7)
        .attr('fill', '#3FAF74')
        .attr('stroke', '#0B1410')
        .attr('stroke-width', 1.5)
      badgeGroup.append('text')
        .text(String(pendingCount))
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#0B1410')
        .attr('font-size', '8px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, monospace')
        .style('pointer-events', 'none')
    })

    // Click: select feature
    nodeGroup.on('click', (_event: MouseEvent, d: GraphNode) => {
      setTooltip(null)
      onSelectFeature(d.id)
    })

    // Hover: tooltip
    nodeGroup
      .on('mouseover', (event: MouseEvent, d: GraphNode) => {
        const svgRect = svg.getBoundingClientRect()
        setTooltip({
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top,
          feature: d.feature,
        })
      })
      .on('mousemove', (event: MouseEvent) => {
        const svgRect = svg.getBoundingClientRect()
        setTooltip((prev) =>
          prev ? { ...prev, x: event.clientX - svgRect.left, y: event.clientY - svgRect.top } : null
        )
      })
      .on('mouseout', () => setTooltip(null))

    // Force simulation
    if (simRef.current) simRef.current.stop()

    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((d) => (d as GraphLink).kind === 'hard' ? 140 : 200)
        .strength((d) => (d as GraphLink).kind === 'hard' ? 0.4 : 0.15)
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collide', d3.forceCollide<GraphNode>()
        .radius((d) => nodeRadius(d.feature) + 18)
        .strength(0.8)
      )
      .alphaDecay(0.025)

    sim.on('tick', () => {
      for (const sel of [hardLink, softLink]) {
        sel
          .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
          .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
          .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
          .attr('y2', (d) => (d.target as GraphNode).y ?? 0)
      }
      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    sim.on('end', () => {
      for (const node of nodes) {
        if (node.x !== undefined && node.y !== undefined) {
          nodePositions.current.set(node.id, { x: node.x, y: node.y })
        }
      }
    })

    nodeGroup.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          setTooltip(null)
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
    )

    simRef.current = sim
    return () => { sim.stop() }
  }, [analysis]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Legend bar */}
      <div className="px-3 py-2 border-b border-canopy-border flex-shrink-0 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-widest text-canopy-muted">Codebase Map</span>
        <div className="flex items-center gap-3 text-[10px] text-canopy-muted flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-tier-high rounded" /> High impact
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-tier-medium rounded" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-tier-low rounded" /> Low
          </span>
          <span className="flex items-center gap-1.5 ml-1">
            <span className="inline-block w-3 h-3 rounded-full bg-canopy-accent text-[7px] font-bold text-canopy-bg flex items-center justify-center leading-none">N</span>
            Pending fixes
          </span>
          <span className="flex items-center gap-1 ml-1">
            <span className="inline-block w-4 border-t border-[#4FCB82] opacity-70" />
            Depends on
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t border-dashed border-[#B8C8C0] opacity-40" />
            Same module
          </span>
          <span className="flex items-center gap-1 ml-1 text-canopy-muted/50">
            Click node to select · Node size = complexity
          </span>
        </div>
      </div>

      {/* D3 canvas */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: '#0B1410' }}
        />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-canopy-surface border border-canopy-border rounded-lg px-3 py-2 text-[11px] shadow-xl max-w-[200px]"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 10,
              transform: tooltip.x > 600 ? 'translateX(-110%)' : undefined,
            }}
          >
            <p className="font-semibold text-canopy-text mb-1">{tooltip.feature.name}</p>
            <p className="text-canopy-accent font-mono">
              ~{(tooltip.feature.sci?.sciGco2PerR ?? 0).toFixed(1)} gCO₂/day
            </p>
            <p className="text-canopy-muted mt-0.5 capitalize">
              {tooltip.feature.sustainabilityTier} impact
            </p>
            {(() => {
              const pending = tooltip.feature.suggestions.filter((s) => s.status === 'suggested').length
              const patterns = [...new Set(
                tooltip.feature.suggestions
                  .filter((s) => s.status === 'suggested')
                  .map((s) => PATTERN_LABELS[s.patternType])
              )]
              return pending > 0 ? (
                <p className="text-canopy-accent mt-0.5">
                  {pending} fix{pending > 1 ? 'es' : ''}: {patterns.join(', ')}
                </p>
              ) : null
            })()}
            <p className="text-canopy-muted/60 mt-0.5">
              {tooltip.feature.metrics.loc} LOC · complexity {tooltip.feature.metrics.cyclomaticComplexity}
            </p>
            <p className="text-canopy-muted/40 mt-1 text-[9px]">Click to select</p>
          </div>
        )}
      </div>
    </div>
  )
}
