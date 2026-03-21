// @ts-nocheck
// Graph webview — runs inside VS Code webview context, NOT the extension host
const vscode = acquireVsCodeApi();

let simulation = null;
let svg = null;
let g = null;
let allNodes = [];
let allLinks = [];

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'loadData') renderGraph(msg.features);
  if (msg.type === 'suggestionApplied') turnGhostNodeGreen(msg.featureId, msg.suggestionId);
  if (msg.type === 'suggestionDismissed') fadeOutGhostNode(msg.featureId, msg.suggestionId);
  if (msg.type === 'focusNode') highlightNode(msg.featureId);
});

function renderGraph(features) {
  const container = document.getElementById('graph');
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // Clear existing
  d3.select('#graph').selectAll('*').remove();

  svg = d3.select('#graph')
    .attr('width', width)
    .attr('height', height);

  g = svg.append('g');

  // Zoom/pan
  const zoom = d3.zoom()
    .scaleExtent([0.2, 4])
    .on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  // Real nodes (limit to 50)
  const realFeatures = features.slice(0, 50);
  const nodes = realFeatures.map(f => ({
    id: f.id,
    name: f.name,
    type: 'feature',
    complexityScore: f.metrics.complexityScore,
    tier: f.sustainabilityTier,
    feature: f,
  }));

  // Ghost nodes — one per pending suggestion
  const ghostNodes = realFeatures.flatMap(f =>
    f.suggestions
      .filter(s => s.status === 'suggested')
      .map(s => ({
        id: `ghost_${s.id}`,
        name: `⚡ -${s.estimatedSavingsPercent}%`,
        type: 'ghost',
        parentId: f.id,
        featureId: f.id,
        suggestionId: s.id,
        patternType: s.patternType,
        explanation: s.explanation,
      }))
  );

  allNodes = [...nodes, ...ghostNodes];

  // Links between real nodes — features sharing files
  const links = buildLinks(realFeatures);

  // Ghost node links to their parent
  const ghostLinks = ghostNodes.map(gn => ({
    source: gn.parentId,
    target: gn.id,
    ghost: true,
  }));

  allLinks = [...links, ...ghostLinks];

  // Force simulation
  simulation = d3.forceSimulation(allNodes)
    .force('link', d3.forceLink(allLinks).id(d => d.id)
      .distance(d => d.ghost ? 60 : 120))
    .force('charge', d3.forceManyBody().strength(d => d.type === 'ghost' ? -50 : -300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.type === 'ghost' ? 22 : 30 + (d.complexityScore || 0) * 30));

  // Draw links
  const link = g.append('g')
    .selectAll('line')
    .data(allLinks)
    .join('line')
    .attr('class', d => d.ghost ? 'link ghost-link' : 'link')
    .attr('stroke', d => d.ghost ? '#22c55e' : '#555')
    .attr('stroke-width', d => d.ghost ? 1 : 1.5)
    .attr('stroke-dasharray', d => d.ghost ? '4,3' : null)
    .attr('stroke-opacity', d => d.ghost ? 0.4 : 0.6);

  // Draw nodes
  const node = g.append('g')
    .selectAll('g')
    .data(allNodes)
    .join('g')
    .attr('class', d => d.type === 'ghost' ? 'node ghost-node' : 'node')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded));

  // Circle for each node
  node.append('circle')
    .attr('r', d => d.type === 'ghost' ? 18 : 20 + (d.complexityScore || 0) * 30)
    .attr('fill', d => {
      if (d.type === 'ghost') return '#d1fae5';
      const colors = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
      return colors[d.tier] || '#888';
    })
    .attr('stroke', d => {
      if (d.type === 'ghost') return '#22c55e';
      return '#fff';
    })
    .attr('stroke-width', d => d.type === 'ghost' ? 2 : 1.5)
    .attr('stroke-dasharray', d => d.type === 'ghost' ? '6,3' : null)
    .attr('opacity', d => d.type === 'ghost' ? 0.45 : 1)
    .attr('cursor', 'pointer');

  // Labels
  node.append('text')
    .text(d => {
      const label = d.name;
      return label.length > 16 ? label.substring(0, 16) + '…' : label;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', d => d.type === 'ghost' ? '#166534' : '#fff')
    .attr('font-size', '11px')
    .attr('pointer-events', 'none');

  // Tooltips
  node.append('title')
    .text(d => {
      if (d.type === 'ghost') {
        return `${d.patternType}\n${d.explanation}`;
      }
      const f = d.feature;
      const tierIcon = { high: '🔴', medium: '🟡', low: '🟢' }[d.tier];
      return `${tierIcon} ${f.name}\nFiles: ${f.files.length}\nLOC: ${f.metrics.loc}\nSCI: ${f.sustainability.sci.score.toFixed(1)} ${f.sustainability.sci.unit}\nElectricity: ${f.sustainability.electricityKwh.toFixed(1)} kWh/month\nCarbon: ${f.sustainability.carbonKgCo2e.toFixed(2)} kg CO₂e/month`;
    });

  // Click handlers
  node.on('click', (event, d) => {
    event.stopPropagation();
    if (d.type === 'ghost') {
      vscode.postMessage({ type: 'ghostNodeClicked', featureId: d.featureId, suggestionId: d.suggestionId });
    } else {
      vscode.postMessage({ type: 'nodeSelected', featureId: d.id });
    }
  });

  // Simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

function buildLinks(features) {
  const links = [];
  const fileToFeature = new Map();

  // Build a map of file -> feature IDs
  for (const f of features) {
    for (const file of f.files) {
      if (!fileToFeature.has(file)) {
        fileToFeature.set(file, []);
      }
      fileToFeature.get(file).push(f.id);
    }
  }

  // Create edges between features that share files
  const edgeSet = new Set();
  for (const [, featureIds] of fileToFeature) {
    for (let i = 0; i < featureIds.length; i++) {
      for (let j = i + 1; j < featureIds.length; j++) {
        const key = [featureIds[i], featureIds[j]].sort().join('::');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          links.push({ source: featureIds[i], target: featureIds[j], ghost: false });
        }
      }
    }
  }

  return links;
}

function dragStarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnded(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function turnGhostNodeGreen(featureId, suggestionId) {
  const ghostId = `ghost_${suggestionId}`;
  d3.selectAll('.ghost-node')
    .filter(d => d.id === ghostId)
    .select('circle')
    .transition()
    .duration(600)
    .attr('fill', '#22c55e')
    .attr('opacity', 1)
    .attr('stroke-dasharray', null);
}

function fadeOutGhostNode(featureId, suggestionId) {
  const ghostId = `ghost_${suggestionId}`;
  d3.selectAll('.ghost-node')
    .filter(d => d.id === ghostId)
    .transition()
    .duration(600)
    .attr('opacity', 0)
    .remove();

  d3.selectAll('.ghost-link')
    .filter(d => d.target.id === ghostId || d.target === ghostId)
    .transition()
    .duration(600)
    .attr('opacity', 0)
    .remove();
}

function highlightNode(featureId) {
  // Pulse animation on the target node
  d3.selectAll('.node')
    .filter(d => d.id === featureId)
    .select('circle')
    .transition()
    .duration(300)
    .attr('stroke', '#fff')
    .attr('stroke-width', 4)
    .transition()
    .duration(300)
    .attr('stroke-width', 1.5);
}
