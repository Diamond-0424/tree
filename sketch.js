/**
 * ============================================================================
 * BREEZE TREE • 隨風擺動之樹
 * Interactive Procedural Tree with Dynamic Wind Harmonics & Particle System
 * Built with p5.js
 * ============================================================================
 */

// Global State
let treeRoot = null;
let maxTreeDepth = 8;
let treeSeed = 1001;
let currentTheme = 'sakura';
let windStrength = 0.45; // 0.0 to 1.0
let gustEnergy = 0;
let mouseWind = 0;
let prevMouseX = 0;
let timeStep = 0;

// Particle & Environment Systems
let fallingPetals = [];
let ambientSpores = [];
let grassBlades = [];
let blossomTipPositions = [];

// Themes Palette Definition
const THEMES = {
  sakura: {
    name: '春櫻',
    accent: '#ff9ebb',
    skyTop: [12, 14, 28],
    skyBottom: [34, 24, 48],
    canopyGlow: [255, 182, 193, 20],
    trunkColors: [
      [58, 42, 38],
      [42, 28, 25],
      [28, 18, 16]
    ],
    leafColors: [
      [255, 183, 197, 210],
      [255, 143, 168, 220],
      [255, 214, 223, 200],
      [255, 240, 245, 230]
    ],
    petalColors: [
      [255, 183, 197, 230],
      [255, 158, 181, 230],
      [255, 220, 230, 240]
    ],
    groundColor: [18, 16, 26]
  },
  summer: {
    name: '盛夏',
    accent: '#10b981',
    skyTop: [6, 18, 30],
    skyBottom: [14, 44, 62],
    canopyGlow: [16, 185, 129, 18],
    trunkColors: [
      [45, 34, 26],
      [36, 26, 20],
      [26, 18, 14]
    ],
    leafColors: [
      [16, 185, 129, 210],
      [5, 150, 105, 220],
      [52, 211, 153, 200],
      [110, 231, 183, 220]
    ],
    petalColors: [
      [52, 211, 153, 220],
      [16, 185, 129, 230],
      [110, 231, 183, 210]
    ],
    groundColor: [12, 24, 24]
  },
  autumn: {
    name: '金秋',
    accent: '#f59e0b',
    skyTop: [22, 12, 18],
    skyBottom: [48, 26, 24],
    canopyGlow: [245, 158, 11, 20],
    trunkColors: [
      [52, 32, 24],
      [38, 22, 16],
      [28, 15, 12]
    ],
    leafColors: [
      [245, 158, 11, 220],
      [217, 119, 6, 220],
      [234, 88, 12, 220],
      [220, 38, 38, 210],
      [253, 224, 71, 230]
    ],
    petalColors: [
      [245, 158, 11, 230],
      [234, 88, 12, 230],
      [253, 224, 71, 240]
    ],
    groundColor: [22, 14, 16]
  },
  twilight: {
    name: '幻夜',
    accent: '#06b6d4',
    skyTop: [4, 7, 20],
    skyBottom: [12, 18, 44],
    canopyGlow: [6, 182, 212, 24],
    trunkColors: [
      [28, 24, 44],
      [20, 18, 34],
      [14, 12, 24]
    ],
    leafColors: [
      [6, 182, 212, 220],
      [139, 92, 246, 220],
      [59, 130, 246, 220],
      [168, 85, 247, 220],
      [224, 242, 254, 240]
    ],
    petalColors: [
      [6, 182, 212, 240],
      [168, 85, 247, 240],
      [125, 211, 252, 250]
    ],
    groundColor: [10, 12, 22]
  }
};

/**
 * Tree Branch Node Class
 * Maintains deterministic structural properties and hierarchy
 */
class BranchNode {
  constructor(length, thickness, baseAngle, depth, id) {
    this.length = length;
    this.thickness = thickness;
    this.baseAngle = baseAngle;
    this.depth = depth;
    this.id = id;
    this.children = [];
    this.leafClusters = [];
    this.curveFactor = random(-0.06, 0.06);

    // If near terminal, attach leaf / petal clusters
    if (depth >= maxTreeDepth - 3) {
      const clusterCount = floor(random(2, 5));
      for (let i = 0; i < clusterCount; i++) {
        this.leafClusters.push({
          offsetX: random(-10, 10),
          offsetY: random(-12, 4),
          size: random(9, 17),
          colorIndex: floor(random(0, 4)),
          angleOffset: random(-PI / 3, PI / 3),
          phase: random(TWO_PI)
        });
      }
    }
  }

  addChild(child) {
    this.children.push(child);
  }
}

/**
 * Petal / Fallen Leaf Particle
 */
class PetalParticle {
  constructor(respawnAnywhere = false) {
    this.reset(respawnAnywhere);
  }

  reset(anywhere = false) {
    // Pick origin: either from canopy tip or screen bounds
    if (!anywhere && blossomTipPositions.length > 0 && random() < 0.75) {
      const tip = random(blossomTipPositions);
      this.x = tip.x + random(-15, 15);
      this.y = tip.y + random(-10, 10);
    } else {
      this.x = random(-50, width * 0.7);
      this.y = anywhere ? random(0, height * 0.85) : random(-40, 20);
    }

    this.size = random(4.5, 9.5);
    this.vx = random(0.8, 2.2);
    this.vy = random(1.0, 2.5);
    this.angle = random(TWO_PI);
    this.spinSpeed = random(-0.04, 0.04);
    this.colorIndex = floor(random(0, THEMES[currentTheme].petalColors.length));
    this.opacity = random(180, 255);
    this.flutterPhase = random(TWO_PI);
    this.flutterFreq = random(0.02, 0.05);
  }

  update(currentWind) {
    this.flutterPhase += this.flutterFreq;
    const windFlutter = sin(this.flutterPhase) * 1.2;

    // Movement influenced by wind and gravity
    this.x += (this.vx + currentWind * 4.5 + windFlutter);
    this.y += (this.vy + abs(windFlutter * 0.3));
    this.angle += this.spinSpeed + currentWind * 0.05;

    // Fade out near ground
    if (this.y > height * 0.88) {
      this.opacity -= 4;
    }

    // Wrap / respawn if dead or out of bounds
    if (this.x > width + 60 || this.y > height * 0.95 || this.opacity <= 0) {
      this.reset(false);
    }
  }

  draw() {
    const pal = THEMES[currentTheme].petalColors;
    const col = pal[this.colorIndex % pal.length];
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noStroke();
    fill(col[0], col[1], col[2], this.opacity);

    // Draw organic petal / leaf teardrop shape
    beginShape();
    vertex(0, -this.size * 0.9);
    bezierVertex(this.size * 0.6, -this.size * 0.4, this.size * 0.5, this.size * 0.7, 0, this.size);
    bezierVertex(-this.size * 0.5, this.size * 0.7, -this.size * 0.6, -this.size * 0.4, 0, -this.size * 0.9);
    endShape(CLOSE);
    pop();
  }
}

/**
 * Ambient Spore / Firefly Particle
 */
class AmbientSpore {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.9);
    this.size = random(1.5, 3.5);
    this.baseY = this.y;
    this.phase = random(TWO_PI);
    this.speed = random(0.3, 0.9);
    this.brightness = random(120, 240);
  }

  update(currentWind) {
    this.phase += 0.02;
    this.x += currentWind * 1.5 + cos(this.phase) * 0.4;
    this.y = this.baseY + sin(this.phase * 0.8) * 15;

    if (this.x > width + 20) this.x = -20;
    if (this.x < -20) this.x = width + 20;
  }

  draw() {
    noStroke();
    const glow = 150 + sin(this.phase) * 90;
    if (currentTheme === 'twilight') {
      fill(6, 182, 212, glow * 0.9);
    } else {
      fill(255, 255, 220, glow * 0.7);
    }
    circle(this.x, this.y, this.size);
  }
}

/**
 * Grass Blade on bottom mound
 */
class GrassBlade {
  constructor(x, y, height) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.tilt = random(-0.15, 0.15);
    this.phase = random(TWO_PI);
  }

  draw(currentWind) {
    const sway = sin(timeStep * 1.5 + this.phase) * 0.12 + currentWind * 0.25;
    stroke(THEMES[currentTheme].trunkColors[0][0] * 0.7,
           THEMES[currentTheme].trunkColors[0][1] * 0.8,
           THEMES[currentTheme].trunkColors[0][2] * 0.7, 180);
    strokeWeight(1.8);
    noFill();
    beginShape();
    vertex(this.x, this.y);
    quadraticVertex(this.x + sway * 12, this.y - this.height * 0.6,
                    this.x + (this.tilt + sway) * 22, this.y - this.height);
    endShape();
  }
}

/**
 * p5.js setup
 */
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(document.body);
  pixelDensity(min(window.devicePixelRatio, 2));

  // Initialize interactive UI DOM hooks
  initUI();

  // Generate initial tree & environment
  regenerateTree();
  initEnvironment();
}

/**
 * Window Resize
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initEnvironment();
}

/**
 * Initialize Environment Elements
 */
function initEnvironment() {
  fallingPetals = [];
  ambientSpores = [];
  grassBlades = [];

  // Spawn petals
  const petalCount = width > 768 ? 95 : 55;
  for (let i = 0; i < petalCount; i++) {
    fallingPetals.push(new PetalParticle(true));
  }

  // Spawn ambient floating spores
  for (let i = 0; i < 35; i++) {
    ambientSpores.push(new AmbientSpore());
  }

  // Spawn grass blades across bottom
  const bladeCount = floor(width / 16);
  for (let i = 0; i < bladeCount; i++) {
    const gx = i * 16 + random(-6, 6);
    const gy = getGroundHeight(gx);
    grassBlades.push(new GrassBlade(gx, gy, random(14, 30)));
  }
}

/**
 * Procedural Tree Generation with Deterministic Seed
 */
function regenerateTree() {
  randomSeed(treeSeed);
  noiseSeed(treeSeed);

  // Compute scale based on viewport
  const trunkLength = constrain(height * 0.23, 110, 190);
  const trunkThickness = constrain(trunkLength * 0.14, 15, 24);

  let nodeIdCounter = 0;

  function buildBranch(length, thickness, depth, baseAngle) {
    const node = new BranchNode(length, thickness, baseAngle, depth, nodeIdCounter++);

    if (depth < maxTreeDepth) {
      // 2 or 3 branches per bifurcation
      const branchCount = depth === 0 ? (random() < 0.3 ? 3 : 2) : (random() < 0.22 ? 3 : 2);

      for (let i = 0; i < branchCount; i++) {
        let childAngle;
        if (branchCount === 2) {
          const spread = random(0.38, 0.62);
          childAngle = (i === 0 ? -1 : 1) * spread + random(-0.1, 0.1);
        } else {
          // 3-way split
          const angles = [-0.55, 0.05, 0.52];
          childAngle = angles[i] + random(-0.08, 0.08);
        }

        const lengthDecay = random(0.72, 0.84);
        const thickDecay = random(0.68, 0.78);

        const childNode = buildBranch(
          length * lengthDecay,
          max(thickness * thickDecay, 1.2),
          depth + 1,
          childAngle
        );
        node.addChild(childNode);
      }
    }
    return node;
  }

  treeRoot = buildBranch(trunkLength, trunkThickness, 0, 0);
}

/**
 * Calculate ground mound curved height
 */
function getGroundHeight(x) {
  const midX = width / 2;
  const distFromCenter = (x - midX) / (width * 0.5);
  // Soft gentle hill curving up under tree
  const mound = cos(constrain(distFromCenter * 1.5, -PI / 2, PI / 2)) * 32;
  return height * 0.89 - mound;
}

/**
 * Main Render Loop
 */
function draw() {
  timeStep += 0.012;

  // Handle Wind Physics Model
  updateWind();

  // 1. Draw Atmospheric Sky Gradient
  drawSkyBackground();

  // 2. Draw Ambient Spores (Background layer)
  const currentTotalWind = getEffectiveWind();
  for (let spore of ambientSpores) {
    spore.update(currentTotalWind);
    spore.draw();
  }

  // 3. Clear collected blossom positions for this frame
  blossomTipPositions = [];

  // 4. Draw Ground Mound & Soft Canopy Glow
  drawEnvironmentLighting();

  // 5. Draw Swaying Procedural Tree
  push();
  const rootX = width / 2;
  const rootY = getGroundHeight(rootX);
  translate(rootX, rootY);

  renderBranch(treeRoot, currentTotalWind);
  pop();

  // 6. Draw Swaying Grass Foreground
  for (let blade of grassBlades) {
    blade.draw(currentTotalWind);
  }

  // 7. Update and Draw Drifting Petals & Leaves
  for (let petal of fallingPetals) {
    petal.update(currentTotalWind);
    petal.draw();
  }
}

/**
 * Wind Dynamics Calculations
 */
function updateWind() {
  // Smoothly decay triggered gusts
  if (gustEnergy > 0.005) {
    gustEnergy *= 0.965;
  } else {
    gustEnergy = 0;
  }

  // Mouse wind integration
  const mouseDeltaX = (mouseX - prevMouseX);
  prevMouseX = mouseX;
  if (abs(mouseDeltaX) > 2) {
    mouseWind += (mouseDeltaX * 0.008);
  }
  mouseWind *= 0.92; // decay
}

function getEffectiveWind() {
  // Base ambient oscillation + Perlin noise wind vector + Gust + Mouse influence
  const baseOscillation = sin(timeStep * 1.2) * 0.15;
  const noiseGust = (noise(timeStep * 0.8, 12.34) - 0.48) * 0.7;

  const total = (windStrength * 1.2 * (0.35 + baseOscillation + noiseGust))
              + gustEnergy * 1.8
              + mouseWind;

  return total;
}

/**
 * Recursive Tree Branch Rendering with Dynamic Sway Harmonics
 */
function renderBranch(node, wind) {
  if (!node) return;

  push();

  // Harmonic sway formula:
  // Lower branches have higher inertia; twigs have high frequency flutter.
  const depthFactor = (node.depth + 1) / (maxTreeDepth + 1);
  const harmonicFrequency = 1.0 + node.depth * 0.45;
  const harmonicPhase = timeStep * harmonicFrequency + node.id * 0.45;

  // Micro vibration for twigs
  const jitter = node.depth >= 4 ? sin(timeStep * 3.5 + node.id) * 0.02 * (windStrength + gustEnergy) : 0;

  // Progressive sway angle
  const swayAngle = node.baseAngle
                  + (wind * 0.28 * depthFactor)
                  + (sin(harmonicPhase) * 0.045 * depthFactor * (1 + windStrength))
                  + node.curveFactor
                  + jitter;

  rotate(swayAngle);

  // Branch Color: trunk gradient towards wood/twigs
  const theme = THEMES[currentTheme];
  const colorIndex = min(floor(node.depth / 3), theme.trunkColors.length - 1);
  const rgb = theme.trunkColors[colorIndex];
  stroke(rgb[0], rgb[1], rgb[2]);
  strokeWeight(node.thickness);
  strokeCap(ROUND);

  // Draw natural tapered branch segment
  line(0, 0, 0, -node.length);

  // Translate to end of branch
  translate(0, -node.length);

  // Render Leaf/Blossom Clusters at outer branches
  if (node.leafClusters.length > 0) {
    drawLeafClusters(node, wind);

    // Record world position for petal particle emission
    if (blossomTipPositions.length < 80) {
      // Approximate screen coordinates
      const matrix = drawingContext.getTransform();
      blossomTipPositions.push({ x: matrix.e, y: matrix.f });
    }
  }

  // Recurse to children
  for (let child of node.children) {
    renderBranch(child, wind);
  }

  pop();
}

/**
 * Draw Organic Blossoms / Leaves on Branch Tips
 */
function drawLeafClusters(node, wind) {
  const theme = THEMES[currentTheme];
  const leaves = theme.leafColors;

  push();
  noStroke();

  for (let cluster of node.leafClusters) {
    const col = leaves[cluster.colorIndex % leaves.length];
    fill(col[0], col[1], col[2], col[3]);

    push();
    // Wind tilt on individual leaf clusters
    const clusterSway = sin(timeStep * 2.2 + cluster.phase) * 0.18 + wind * 0.25;
    translate(cluster.offsetX, cluster.offsetY);
    rotate(cluster.angleOffset + clusterSway);

    // Soft organic oval blossom
    ellipse(0, 0, cluster.size * 1.3, cluster.size * 0.85);

    // Soft inner highlight petal
    fill(255, 255, 255, col[3] * 0.4);
    ellipse(-cluster.size * 0.15, -cluster.size * 0.1, cluster.size * 0.55, cluster.size * 0.35);

    pop();
  }

  pop();
}

/**
 * Atmospheric Sky Background
 */
function drawSkyBackground() {
  const theme = THEMES[currentTheme];
  const topC = color(theme.skyTop[0], theme.skyTop[1], theme.skyTop[2]);
  const botC = color(theme.skyBottom[0], theme.skyBottom[1], theme.skyBottom[2]);

  // Smooth vertical gradient
  noFill();
  for (let y = 0; y <= height; y += 4) {
    const inter = map(y, 0, height, 0, 1);
    const c = lerpColor(topC, botC, inter);
    stroke(c);
    strokeWeight(4.5);
    line(0, y, width, y);
  }
}

/**
 * Environment Lighting & Ground Mound
 */
function drawEnvironmentLighting() {
  const theme = THEMES[currentTheme];

  // Soft mystical canopy aura behind tree
  push();
  noStroke();
  const auraRgb = theme.canopyGlow;
  const glowX = width / 2;
  const glowY = height * 0.55;
  const glowRadius = min(width, height) * 0.7;

  // Radial glow gradient simulation
  for (let r = glowRadius; r > 0; r -= 40) {
    const alphaVal = map(r, 0, glowRadius, auraRgb[3], 0);
    fill(auraRgb[0], auraRgb[1], auraRgb[2], alphaVal);
    circle(glowX, glowY, r);
  }
  pop();

  // Bottom Ground Mound
  push();
  noStroke();
  const gCol = theme.groundColor;
  fill(gCol[0], gCol[1], gCol[2]);

  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width + 20; x += 30) {
    vertex(x, getGroundHeight(x));
  }
  vertex(width, height);
  endShape(CLOSE);
  pop();
}

/**
 * Initialize DOM UI Controls & Events
 */
function initUI() {
  const windSlider = document.getElementById('windSlider');
  const windText = document.getElementById('windValueText');
  const btnGust = document.getElementById('btnGust');
  const btnRegrow = document.getElementById('btnRegrow');
  const themeButtons = document.querySelectorAll('.theme-btn');

  // Wind Force Slider
  if (windSlider) {
    windSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      windStrength = val / 100;
      if (windText) windText.textContent = `${val}%`;
    });
  }

  // Trigger Sudden Wind Gust
  if (btnGust) {
    btnGust.addEventListener('click', () => {
      gustEnergy = 1.35;
      // Pulse animation effect on button
      btnGust.style.transform = 'scale(0.95)';
      setTimeout(() => { btnGust.style.transform = ''; }, 150);
    });
  }

  // Regrow Tree with New Seed
  if (btnRegrow) {
    btnRegrow.addEventListener('click', () => {
      treeSeed = floor(random(1000, 999999));
      regenerateTree();
      initEnvironment();
    });
  }

  // Season Themes
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const themeKey = btn.getAttribute('data-theme');
      if (THEMES[themeKey]) {
        currentTheme = themeKey;

        // Update active UI button state
        themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update CSS accent
        document.documentElement.style.setProperty('--accent-color', THEMES[themeKey].accent);
        document.documentElement.style.setProperty('--accent-glow', `${THEMES[themeKey].accent}55`);
      }
    });
  });
}
