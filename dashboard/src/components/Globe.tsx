import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

interface GlobeProps {
  className?: string
  style?: React.CSSProperties
  autoRotate?: boolean
  rotationSpeed?: number
}

type WorldTopology = Topology<{
  countries: GeometryCollection
  land: GeometryCollection
}>

// ── Color constants ───────────────────────────────────────────────────────────
const LAND_FILL        = '#1c3d2d'
const LAND_STROKE      = '#30584a'
const GRATICULE_MINOR  = 'rgba(63,175,116,0.05)'
const GRATICULE_MAJOR  = 'rgba(63,175,116,0.11)'
const GRATICULE_EQUATOR = 'rgba(63,175,116,0.20)'
const GRATICULE_PRIME  = 'rgba(63,175,116,0.13)'
const ATMO_COLOR       = 'rgba(63,175,116,0.20)'

// GeoJSON line for equator (lat = 0, full longitude sweep)
const EQUATOR_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: Array.from({ length: 361 }, (_, i) => [i - 180, 0]),
  },
}

// GeoJSON line for prime meridian (lon = 0, pole-to-pole)
const PRIME_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: Array.from({ length: 181 }, (_, i) => [0, i - 90]),
  },
}

export default function Globe({ className, style, autoRotate = true, rotationSpeed = 0.08 }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const stateRef = useRef({
    rotation: [-30, -25, 0] as [number, number, number],
    isDragging: false,
    frameId: 0,
    velX: 0,
    velY: 0,
    projection: null as d3.GeoProjection | null,
    path: null as d3.GeoPath | null,
    worldData: null as WorldTopology | null,
  })

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const state = stateRef.current

    const getSize = () => {
      const { width, height } = container.getBoundingClientRect()
      const side = Math.min(width || 400, height || 400)
      return { side, cx: side / 2, cy: side / 2, radius: side / 2 - 4 }
    }

    let { side, cx, cy, radius } = getSize()

    // ── Projection + path ─────────────────────────────────────────────────────
    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([cx, cy])
      .rotate(state.rotation)
      .clipAngle(90)
    state.projection = projection

    const path = d3.geoPath(projection)
    state.path = path

    // ── SVG scaffold ──────────────────────────────────────────────────────────
    const d3svg = d3.select(svg)
    d3svg.attr('viewBox', `0 0 ${side} ${side}`).attr('width', side).attr('height', side)

    const defs = d3svg.append('defs')

    // Atmosphere blur filter (for drop shadow)
    const atmoFilter = defs.append('filter')
      .attr('id', 'globe-atmo-blur')
      .attr('x', '-40%').attr('y', '-40%').attr('width', '180%').attr('height', '180%')
    atmoFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '10')

    // Sphere fill: radial gradient for subtle lighting
    const sphereGrad = defs.append('radialGradient')
      .attr('id', 'globe-sphere-fill')
      .attr('cx', '38%').attr('cy', '35%').attr('r', '55%')
    sphereGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0e1e18')
    sphereGrad.append('stop').attr('offset', '100%').attr('stop-color', '#040b07')

    // Atmosphere rim gradient
    const atmGrad = defs.append('radialGradient')
      .attr('id', 'globe-atmosphere')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
    atmGrad.append('stop').attr('offset', '76%').attr('stop-color', 'transparent')
    atmGrad.append('stop').attr('offset', '100%').attr('stop-color', ATMO_COLOR)

    // Sphere clip path
    defs.append('clipPath').attr('id', 'globe-clip')
      .append('use').attr('href', '#globe-sphere')

    // ── Elements (draw order matters: back → front) ───────────────────────────

    // Drop shadow behind sphere
    d3svg.append('circle')
      .attr('class', 'globe-shadow')
      .attr('cx', cx + 8).attr('cy', cy + 8).attr('r', radius)
      .attr('fill', 'rgba(0,0,0,0.4)')
      .attr('filter', 'url(#globe-atmo-blur)')

    // Sphere base (lit gradient)
    d3svg.append('circle')
      .attr('id', 'globe-sphere')
      .attr('cx', cx).attr('cy', cy).attr('r', radius)
      .attr('fill', 'url(#globe-sphere-fill)')
      .attr('stroke', 'rgba(30,60,45,0.5)')
      .attr('stroke-width', 0.5)

    // Minor graticule (15° grid — very faint)
    const minorGrat = d3.geoGraticule().step([15, 15])
    const minorGratEl = d3svg.append('path')
      .attr('class', 'grat-minor')
      .datum(minorGrat())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', GRATICULE_MINOR)
      .attr('stroke-width', 0.3)
      .attr('clip-path', 'url(#globe-clip)')

    // Major graticule (30° grid — slightly stronger)
    const majorGrat = d3.geoGraticule().step([30, 30])
    const majorGratEl = d3svg.append('path')
      .attr('class', 'grat-major')
      .datum(majorGrat())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', GRATICULE_MAJOR)
      .attr('stroke-width', 0.5)
      .attr('clip-path', 'url(#globe-clip)')

    // Equator — dashed, slightly prominent
    const equatorEl = d3svg.append('path')
      .attr('class', 'grat-equator')
      .datum(EQUATOR_GEOJSON)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', GRATICULE_EQUATOR)
      .attr('stroke-width', 0.7)
      .attr('stroke-dasharray', '2,4')
      .attr('clip-path', 'url(#globe-clip)')

    // Prime meridian — dashed, subtler
    const primeEl = d3svg.append('path')
      .attr('class', 'grat-prime')
      .datum(PRIME_GEOJSON)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', GRATICULE_PRIME)
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '1,6')
      .attr('clip-path', 'url(#globe-clip)')

    // Countries group (starts transparent, fades in after data loads)
    const countriesG = d3svg.append('g')
      .attr('class', 'countries')
      .attr('clip-path', 'url(#globe-clip)')
      .attr('opacity', 0)

    // Atmosphere overlay (on top of everything)
    d3svg.append('circle')
      .attr('class', 'atmosphere')
      .attr('cx', cx).attr('cy', cy).attr('r', radius)
      .attr('fill', 'url(#globe-atmosphere)')
      .attr('pointer-events', 'none')

    // ── Render helper ─────────────────────────────────────────────────────────
    function render() {
      minorGratEl.attr('d', path)
      majorGratEl.attr('d', path)
      equatorEl.attr('d', path)
      primeEl.attr('d', path)
      countriesG.selectAll<SVGPathElement, d3.GeoPermissibleObjects>('path.country')
        .attr('d', path)
    }

    // ── Load world atlas ──────────────────────────────────────────────────────
    if (state.worldData) {
      drawCountries(state.worldData)
    } else {
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then((r) => r.json())
        .then((world: WorldTopology) => {
          state.worldData = world
          drawCountries(world)
        })
        .catch(() => { /* graceful: globe shows without land on fetch failure */ })
    }

    function drawCountries(world: WorldTopology) {
      const land = topojson.feature(world, world.objects.land)
      if (land.type === 'FeatureCollection') {
        countriesG.selectAll('path.country')
          .data(land.features)
          .join('path')
          .attr('class', 'country')
          .attr('d', (d) => path(d))
          .attr('fill', LAND_FILL)
          .attr('stroke', LAND_STROKE)
          .attr('stroke-width', 0.5)

        // Fade in land masses
        countriesG
          .transition()
          .duration(900)
          .ease(d3.easeCubicOut)
          .attr('opacity', 1)
      }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    const shouldRotate = autoRotate && !prefersReducedMotion.current

    function animate() {
      if (!state.isDragging) {
        if (shouldRotate) {
          state.rotation[0] += rotationSpeed
        }
        // Apply inertia when not dragging and has residual velocity
        if (Math.abs(state.velX) + Math.abs(state.velY) > 0.005) {
          state.rotation[0] += state.velX
          state.rotation[1] -= state.velY
          state.rotation[1] = Math.max(-85, Math.min(85, state.rotation[1]))
          state.velX *= 0.88
          state.velY *= 0.88
        }
        if (shouldRotate || Math.abs(state.velX) + Math.abs(state.velY) > 0.005) {
          projection.rotate(state.rotation)
          render()
        }
      }
      state.frameId = requestAnimationFrame(animate)
    }

    state.frameId = requestAnimationFrame(animate)

    // ── Drag to rotate ────────────────────────────────────────────────────────
    const sensitivity = 0.28
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('start', () => {
        state.isDragging = true
        state.velX = 0
        state.velY = 0
      })
      .on('drag', (event) => {
        state.velX = event.dx * sensitivity
        state.velY = event.dy * sensitivity
        state.rotation[0] += state.velX
        state.rotation[1] -= state.velY
        state.rotation[1] = Math.max(-85, Math.min(85, state.rotation[1]))
        projection.rotate(state.rotation)
        render()
      })
      .on('end', () => {
        state.isDragging = false
        // velX/velY carry last-frame velocity → inertia runs in animate()
      })

    d3svg.call(drag).style('cursor', 'grab')
    d3svg.on('mousedown.cursor', () => d3svg.style('cursor', 'grabbing'))
    d3svg.on('mouseup.cursor', () => d3svg.style('cursor', 'grab'))

    // ── Resize ────────────────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const s = getSize()
      side = s.side; cx = s.cx; cy = s.cy; radius = s.radius
      projection.scale(radius).translate([cx, cy])
      d3svg.attr('viewBox', `0 0 ${side} ${side}`).attr('width', side).attr('height', side)
      d3svg.select('#globe-sphere').attr('cx', cx).attr('cy', cy).attr('r', radius)
      d3svg.select('.globe-shadow').attr('cx', cx + 8).attr('cy', cy + 8).attr('r', radius)
      d3svg.select('.atmosphere').attr('cx', cx).attr('cy', cy).attr('r', radius)
      render()
    })
    resizeObserver.observe(container)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(state.frameId)
      resizeObserver.disconnect()
      d3svg.selectAll('*').remove()
    }
  }, [autoRotate, rotationSpeed])

  return (
    <div ref={containerRef} className={className} style={{ lineHeight: 0, ...style }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
