import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { AnalysisResult, Feature } from '../lib/types'

interface Props {
  analysis: AnalysisResult
  onOpenDiff: (featureId: string, suggestionId: string) => Promise<void>
}

interface RealNode extends d3.SimulationNodeDatum {
  kind: 'real'
  id: string
  feature: Feature
}

interface GhostNode extends d3.SimulationNodeDatum {
  kind: 'ghost'
  id: string
  featureId: string
  suggestionId: string
  label: string
  savingsPct: number
}

type GraphNode = RealNode | GhostNode

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  kind: 'dep' | 'ghost'
}

const TIER_FILL: Record<Feature['sustainabilityTier'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

function buildGraph(analysis: AnalysisResult): { nodes: GraphNode[]; links: GraphLink[] } {
  const featureIds = new Set(analysis.features.map((f) => f.id))
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  for (const f of analysis.features) {
    nodes.push({ kind: 'real', id: f.id, feature: f })
  }

  // Dependency links (only between known features)
  for (const f of analysis.features) {
    for (const depId of (f as Feature & { dependencies?: string[] }).dependencies ?? []) {
      if (featureIds.has(depId) && depId !== f.id) {
        links.push({ kind: 'dep', source: f.id, target: depId })
      }
    }
  }

  // Ghost nodes for pending suggestions
  for (const f of analysis.features) {
    for (const s of f.suggestions) {
      if (s.status !== 'suggested') continue
      const ghostId = `ghost-${s.id}`
      nodes.push({
        kind: 'ghost',
        id: ghostId,
        featureId: f.id,
        suggestionId: s.id,
        label: `Greener ${f.name}`,
        savingsPct: s.estimatedSavingsPercent,
      })
      links.push({ kind: 'ghost', source: f.id, target: ghostId })
    }
  }

  return { nodes, links }
}

export default function GraphPanel({ analysis, onOpenDiff }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const { width, height } = svg.getBoundingClientRect()
    if (width === 0 || height === 0) return

    const { nodes, links } = buildGraph(analysis)

    // Restore saved positions
    for (const node of nodes) {
      const saved = nodePositions.current.get(node.id)
      if (saved) {
        node.x = saved.x
        node.y = saved.y
      } else {
        node.x = width / 2 + (Math.random() - 0.5) * 100
        node.y = height / 2 + (Math.random() - 0.5) * 100
      }
    }

    const d3svg = d3.select(svg)
    d3svg.selectAll('*').remove()

    const g = d3svg.append('g')

    // Zoom + pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    d3svg.call(zoom)

    // Arrow marker for dep links
    d3svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#2a3828')

    // Links
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.kind === 'ghost' ? '#22c55e' : '#2a3828')
      .attr('stroke-width', (d) => d.kind === 'ghost' ? 1.5 : 1)
      .attr('stroke-dasharray', (d) => d.kind === 'ghost' ? '4,3' : 'none')
      .attr('marker-end', (d) => d.kind === 'dep' ? 'url(#arrow)' : null)
      .attr('opacity', 0.7)

    // Node groups
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .style('cursor', (d) => d.kind === 'ghost' ? 'pointer' : 'default')
      .on('click', (_event, d) => {
        if (d.kind === 'ghost') {
          onOpenDiff(d.featureId, d.suggestionId)
        }
      })

    // Circles
    nodeGroup.append('circle')
      .attr('r', (d) => {
        if (d.kind === 'ghost') return 12
        const r = clamp(d.feature.metrics.complexityScore * 6, 10, 40)
        return r
      })
      .attr('fill', (d) => {
        if (d.kind === 'ghost') return 'transparent'
        return TIER_FILL[d.feature.sustainabilityTier]
      })
      .attr('fill-opacity', (d) => d.kind === 'ghost' ? 0 : 0.15)
      .attr('stroke', (d) => {
        if (d.kind === 'ghost') return '#22c55e'
        return TIER_FILL[d.feature.sustainabilityTier]
      })
      .attr('stroke-width', (d) => d.kind === 'ghost' ? 1.5 : 2)
      .attr('stroke-dasharray', (d) => d.kind === 'ghost' ? '4,3' : 'none')
      .attr('stroke-opacity', 0.8)

    // Labels
    nodeGroup.append('text')
      .text((d) => {
        const label = d.kind === 'ghost' ? d.label : d.feature.name
        return label.length > 18 ? label.slice(0, 16) + '…' : label
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => {
        const r = d.kind === 'ghost' ? 12 : clamp(d.feature.metrics.complexityScore * 6, 10, 40)
        return r + 12
      })
      .attr('fill', (d) => d.kind === 'ghost' ? '#22c55e' : '#e2f0e2')
      .attr('fill-opacity', (d) => d.kind === 'ghost' ? 0.7 : 1)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .style('pointer-events', 'none')

    // Savings badge on ghost nodes
    nodeGroup.filter((d) => d.kind === 'ghost').append('text')
      .text((d) => d.kind === 'ghost' ? `-${d.savingsPct}%` : '')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#22c55e')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .style('pointer-events', 'none')

    // Force simulation
    if (simRef.current) simRef.current.stop()

    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((d) => d.kind === 'ghost' ? 70 : 120)
        .strength((d) => d.kind === 'ghost' ? 0.8 : 0.3)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => {
        if (d.kind === 'ghost') return 20
        return clamp(d.feature.metrics.complexityScore * 6, 10, 40) + 15
      }))
      .alphaDecay(0.03)

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0)

      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    sim.on('end', () => {
      // Save positions for next render
      for (const node of nodes) {
        if (node.x !== undefined && node.y !== undefined) {
          nodePositions.current.set(node.id, { x: node.x, y: node.y })
        }
      }
    })

    // Drag
    nodeGroup.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
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

    return () => {
      sim.stop()
    }
  }, [analysis, onOpenDiff])

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-3 py-2 border-b border-canopy-border flex-shrink-0 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-widest text-canopy-muted">Codebase Map</span>
        <div className="flex items-center gap-3 text-[10px] text-canopy-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 bg-tier-high rounded" /> High impact
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 bg-tier-medium rounded" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 bg-tier-low rounded" /> Low
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <svg width="16" height="8">
              <line x1="0" y1="4" x2="16" y2="4" stroke="#22c55e" strokeDasharray="3,2" strokeWidth="1.5" />
            </svg>
            Ghost node (click to apply)
          </span>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="flex-1 w-full"
        style={{ background: '#0a0f0a' }}
      />
    </div>
  )
}
