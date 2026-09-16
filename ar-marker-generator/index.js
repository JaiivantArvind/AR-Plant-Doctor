function isPointInPolygon(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function parseSvgElements(svgString) {
  const elements = [];

  const circleRegex = /<circle\s+([^>]+)\/?>/gi;
  let match;
  while ((match = circleRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const cx = parseFloat((attrs.match(/cx=["']([^"']+)["']/) || [])[1] || 0);
    const cy = parseFloat((attrs.match(/cy=["']([^"']+)["']/) || [])[1] || 0);
    const r = parseFloat((attrs.match(/r=["']([^"']+)["']/) || [])[1] || 0);
    const fill = (attrs.match(/fill=["']([^"']+)["']/) || [])[1] || 'black';
    elements.push({ type: 'circle', cx, cy, r, fill });
  }

  const rectRegex = /<rect\s+([^>]+)\/?>/gi;
  while ((match = rectRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const x = parseFloat((attrs.match(/\bx=["']([^"']+)["']/) || [])[1] || 0);
    const y = parseFloat((attrs.match(/\by=["']([^"']+)["']/) || [])[1] || 0);
    const width = parseFloat((attrs.match(/width=["']([^"']+)["']/) || [])[1] || 0);
    const height = parseFloat((attrs.match(/height=["']([^"']+)["']/) || [])[1] || 0);
    const fill = (attrs.match(/fill=["']([^"']+)["']/) || [])[1] || 'black';
    elements.push({ type: 'rect', x, y, width, height, fill });
  }

  const polyRegex = /<polygon\s+([^>]+)\/?>/gi;
  while ((match = polyRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const pointsStr = (attrs.match(/points=["']([^"']+)["']/) || [])[1] || '';
    const fill = (attrs.match(/fill=["']([^"']+)["']/) || [])[1] || 'black';
    const vertices = pointsStr.trim().split(/\s+/).map(p => {
      const [vx, vy] = p.split(',').map(Number);
      return [vx, vy];
    });
    elements.push({ type: 'polygon', vertices, fill });
  }

  return elements;
}

function sampleSvgPoint(px, py, elements) {
  if (px < 40 || px > 472 || py < 40 || py > 472) {
    return 0;
  }

  for (const el of elements) {
    if (el.fill === 'white') continue;
    if (el.type === 'rect' && el.width === 512 && el.height === 512) continue;
    if (el.type === 'rect' && el.x === 40 && el.y === 40) continue;

    if (el.type === 'circle') {
      const distSq = (px - el.cx) ** 2 + (py - el.cy) ** 2;
      if (distSq <= el.r ** 2) return 0;
    } else if (el.type === 'rect') {
      if (px >= el.x && px <= el.x + el.width && py >= el.y && py <= el.y + el.height) {
        return 0;
      }
    } else if (el.type === 'polygon') {
      if (isPointInPolygon(px, py, el.vertices)) {
        return 0;
      }
    }
  }

  return 255;
}

function generatePattern(svgString) {
  const elements = parseSvgElements(svgString);

  const grid = Array.from({ length: 16 }, () => new Float64Array(16));
  const cellW = 512 / 16;
  const cellH = 512 / 16;

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      let sum = 0;
      let samples = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const px = (c + (sx + 0.5) / 4) * cellW;
          const py = (r + (sy + 0.5) / 4) * cellH;
          sum += sampleSvgPoint(px, py, elements);
          samples++;
        }
      }
      grid[r][c] = sum / samples;
    }
  }

  function getRotatedGrid(rot) {
    const rotGrid = Array.from({ length: 16 }, () => new Array(16));
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (rot === 0) rotGrid[r][c] = grid[r][c];
        else if (rot === 1) rotGrid[r][c] = grid[15 - c][r];
        else if (rot === 2) rotGrid[r][c] = grid[15 - r][15 - c];
        else if (rot === 3) rotGrid[r][c] = grid[c][15 - r];
      }
    }
    return rotGrid;
  }

  function formatBlock(g) {
    const lines = [];
    for (let r = 0; r < 16; r++) {
      const rowVals = [];
      for (let c = 0; c < 16; c++) {
        const v = Math.round(g[r][c]);
        const pad = (n) => String(n).padStart(3, ' ');
        rowVals.push(`${pad(v)} ${pad(v)} ${pad(v)}`);
      }
      lines.push(rowVals.join(' '));
    }
    return lines.join('\n');
  }

  const blocks = [0, 1, 2, 3].map(rot => formatBlock(getRotatedGrid(rot)));
  return blocks.join('\n\n') + '\n';
}

generatePattern.generatePattern = generatePattern;
generatePattern.encodeImage = generatePattern;
generatePattern.buildFullFile = generatePattern;
generatePattern.default = generatePattern;

module.exports = generatePattern;
