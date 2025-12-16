// Marble physics system: Handles marble movement, collision detection, and boundary processing
// Refactored to use XPBD (Extended Position Based Dynamics) for better stability

import type { Marble } from "./mouseInteraction";

// Extend Marble interface to include previous positions for XPBD
interface PhysicsMarble extends Marble {
  prevX?: number;
  prevY?: number;
  prevVx?: number;
  prevVy?: number;
}

export interface PhysicsConfig {
  fieldWidth: number;
  fieldHeight: number;
  damping?: number; // Air resistance coefficient
  restitution?: number; // Collision restitution coefficient
  wallBounce?: number; // Wall bounce coefficient
  minSpeed?: number; // Minimum speed
  maxSpeed?: number; // Maximum speed
  enableCollisions?: boolean; // Enable/Disable collisions
  debugCanvas?: HTMLCanvasElement | null; // Optional canvas for debug rendering
  debugVectorScale?: number; // Scale factor for velocity vectors (default: 0.5)
}

interface Contact {
  a: PhysicsMarble;
  b: PhysicsMarble;
  nx: number;
  ny: number;
  dist: number; // Penetration depth or distance
}

export class MarblePhysics {
  public config: PhysicsConfig;
  private currentContacts: Contact[] = [];

  constructor(config: PhysicsConfig) {
    this.config = {
      fieldWidth: config.fieldWidth,
      fieldHeight: config.fieldHeight,
      damping: config.damping ?? 0.9985,
      restitution: config.restitution ?? 0.92,
      wallBounce: config.wallBounce ?? 0.85,
      minSpeed: config.minSpeed ?? 30,
      maxSpeed: config.maxSpeed ?? 800,
      enableCollisions: config.enableCollisions ?? true,
      debugCanvas: config.debugCanvas ?? null,
      debugVectorScale: config.debugVectorScale ?? 0.5,
    };
  }

  // 1. Integration Step: Apply external forces and predict new positions
  // XPBD: x' = x + v * dt
  public updatePositions(marbles: PhysicsMarble[], dt: number): void {
    const { damping, minSpeed, maxSpeed } = this.config;

    for (const m of marbles) {
      // Store Velocity for Restitution (XPBD needs pre-solve velocity)
      m.prevVx = m.vx;
      m.prevVy = m.vy;

      // Initialize prev positions if missing
      if (m.prevX === undefined) m.prevX = m.x;
      if (m.prevY === undefined) m.prevY = m.y;

      // Apply external forces to velocity (e.g. Damping)
      if (damping !== undefined && damping < 1) {
        const dampingFactor = damping ** (dt * 60);
        m.vx *= dampingFactor;
        m.vy *= dampingFactor;
      }

      // Limit max speed
      const speed = Math.hypot(m.vx, m.vy);

      // Maintain minimum speed (prevent complete stop)
      if (minSpeed !== undefined && speed > 0 && speed < minSpeed) {
        const scale = minSpeed / speed;
        m.vx *= scale;
        m.vy *= scale;
      }

      // Limit maximum speed
      if (maxSpeed !== undefined && speed > maxSpeed) {
        const scale = maxSpeed / speed;
        m.vx *= scale;
        m.vy *= scale;
      }

      // Store current position as previous
      m.prevX = m.x;
      m.prevY = m.y;

      // Predict new position
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
  }

  // 2. Constraint Solving: Correct positions to satisfy constraints
  public handleCollisions(marbles: PhysicsMarble[]): void {
    const { enableCollisions, fieldWidth, fieldHeight } = this.config;
    this.currentContacts = []; // Clear previous contacts

    // --- Boundary Constraints (Position Correction) ---
    for (const m of marbles) {
      if (m.x < m.radius) m.x = m.radius;
      if (m.x > fieldWidth - m.radius) m.x = fieldWidth - m.radius;
      if (m.y < m.radius) m.y = m.radius;
      if (m.y > fieldHeight - m.radius) m.y = fieldHeight - m.radius;
    }

    // --- Marble-Marble Collisions (Grid-based) ---
    if (enableCollisions !== false) {
      this.handleMarbleCollisions(marbles);
    }
  }

  private handleMarbleCollisions(marbles: PhysicsMarble[]) {
    const { fieldWidth, fieldHeight } = this.config;

    // 1. Determine grid cell size
    // Using the maximum diameter of any marble ensures we only need to check adjacent cells.
    // If marbles can vary wildly in size, this might need tuning, but max diameter is safe.
    let maxDiameter = 0;
    for (const m of marbles) {
      if (m.radius * 2 > maxDiameter) maxDiameter = m.radius * 2;
    }
    // Fallback if no marbles or something goes wrong
    if (maxDiameter === 0) return;

    const cellSize = maxDiameter;
    const gridWidth = Math.ceil(fieldWidth / cellSize);
    const gridHeight = Math.ceil(fieldHeight / cellSize);

    // 2. Build the grid
    // Map: cellIndex -> Particle[]
    const grid = new Map<number, PhysicsMarble[]>();
    const getGridIndex = (x: number, y: number) => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return -1;
      return gx + gy * gridWidth;
    };

    for (const m of marbles) {
      const index = getGridIndex(m.x, m.y);
      if (index === -1) continue;
      if (!grid.has(index)) grid.set(index, []);
      grid.get(index)?.push(m);
    }

    // 3. Solve Collisions (Grid-based)
    // We iterate through each marble, find its cell, and check that cell + neighbors
    for (const i_marble of marbles) {
      const gx = Math.floor(i_marble.x / cellSize);
      const gy = Math.floor(i_marble.y / cellSize);

      // Check 3x3 neighbors (including own cell)
      // Optimization: We could only check "forward" cells to avoid double checks,
      // but since we need to resolve for both, and the grid logic is simpler to iterate neighbors:
      // Standard way to avoid double checking A vs B and B vs A is to check all neighbors
      // and only resolve if ID(A) < ID(B) or similar check.

      for (let nx = gx - 1; nx <= gx + 1; nx++) {
        for (let ny = gy - 1; ny <= gy + 1; ny++) {
          if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

          const cellMarbles = grid.get(nx + ny * gridWidth);
          if (!cellMarbles) continue;

          for (const j_marble of cellMarbles) {
            // Avoid self-collision
            if (i_marble === j_marble) continue;
            if (i_marble.id >= j_marble.id) continue; // Check unique pair

            // Avoid double checking: only check if index(i) < index(j)
            // But here we rely on the object content.
            // Since marbles is an array, we can check if marbles.indexOf(i) < marbles.indexOf(j)?
            // That's O(N) inside loop.
            // Instead, let's just do the check and rely on the fact that if we resolve A vs B,
            // we might resolve B vs A later.
            // Ideally: We iterate unique pairs.
            // Optimization: Only check half-neighborhood?
            // Or simpler: check all, but only act if i_marble.id < j_marble.id

            const a = i_marble;
            const b = j_marble;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const minDist = a.radius + b.radius;
            const minDistSq = minDist * minDist;

            if (distSq < minDistSq) {
              const dist = Math.sqrt(distSq) || 0.001;
              const nX = dx / dist;
              const nY = dy / dist;
              const penetration = minDist - dist;

              // XPBD Position Correction
              const wA = 1 / a.mass;
              const wB = 1 / b.mass;
              const wSum = wA + wB;

              if (wSum === 0) continue;

              // dx_p = (w / wSum) * penetration * n
              // Compliance = 0 (hard constraint)
              const lambda = penetration / wSum;

              const deltaX = nX * lambda;
              const deltaY = nY * lambda;

              a.x -= deltaX * wA;
              a.y -= deltaY * wA;
              b.x += deltaX * wB;
              b.y += deltaY * wB;

              // Store contact for velocity resolve
              this.currentContacts.push({
                a,
                b,
                nx: nX,
                ny: nY,
                dist: penetration,
              });
            }
          }
        }
      }
    }
  }

  // 3. Velocity Update (and Resolve)
  // XPBD: v = (x - prevX) / dt
  // Then apply restitution to v
  public resolveVelocities(marbles: PhysicsMarble[], dt: number): void {
    // 3a. Update velocities from position change
    for (const m of marbles) {
      if (m.prevX !== undefined && m.prevY !== undefined) {
        m.vx = (m.x - m.prevX) / dt;
        m.vy = (m.y - m.prevY) / dt;
      }
    }

    // 3b. Apply Wall Bounce (Velocity Reflection)
    const { fieldWidth, fieldHeight, wallBounce } = this.config;
    const e = wallBounce ?? 0.85;

    for (const m of marbles) {
      // Left Wall
      if (m.x <= m.radius + 0.5 && m.vx < 0) m.vx *= -e;
      // Right Wall
      if (m.x >= fieldWidth - m.radius - 0.5 && m.vx > 0) m.vx *= -e;
      // Top Wall
      if (m.y <= m.radius + 0.5 && m.vy < 0) m.vy *= -e;
      // Bottom Wall
      if (m.y >= fieldHeight - m.radius - 0.5 && m.vy > 0) m.vy *= -e;
    }

    // 3c. Apply Marble Restitution
    this.applyRestitution();
  }

  private applyRestitution() {
    const restitution = this.config.restitution ?? 0.92;

    for (const contact of this.currentContacts) {
      const { a, b, nx, ny } = contact;
      // Use stored pre-velocities
      const vax = a.prevVx ?? 0;
      const vay = a.prevVy ?? 0;
      const vbx = b.prevVx ?? 0;
      const vby = b.prevVy ?? 0;

      const dvx = vbx - vax;
      const dvy = vby - vay;
      const vn_pre = dvx * nx + dvy * ny;

      // If separating already, skip
      if (vn_pre > 0) continue;

      // Target: vn_final = -e * vn_pre
      const vn_current = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const vn_goal = -restitution * vn_pre;
      const delta_vn = vn_goal - vn_current;

      // Only apply if we need to add impulse
      if (delta_vn <= 0) continue;

      const wA = 1 / a.mass;
      const wB = 1 / b.mass;
      const wSum = wA + wB;
      if (wSum === 0) continue;

      const impulse = delta_vn / wSum;
      a.vx -= impulse * wA * nx;
      a.vy -= impulse * wA * ny;
      b.vx += impulse * wB * nx;
      b.vy += impulse * wB * ny;
    }
  }

  // Render marbles to DOM
  public render(marbles: Marble[]): void {
    for (const m of marbles) {
      m.node.style.transform = `translate(${m.x - m.radius}px, ${m.y - m.radius}px)`;
    }
  }

  // Update configuration
  public updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  // Render debug velocity vectors on canvas
  public renderDebugVectors(marbles: Marble[]): void {
    const canvas = this.config.debugCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = this.config.debugVectorScale ?? 0.5;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const m of marbles) {
      const speed = Math.hypot(m.vx, m.vy);
      if (speed < 1) continue; // Skip very slow marbles

      const powerFactor = speed ** -0.1;

      // Calculate arrow end point
      const endX = m.x + m.vx * scale * powerFactor;
      const endY = m.y + m.vy * scale * powerFactor;

      // Color based on speed (green -> yellow -> red)
      const normalizedSpeed = Math.min(speed / 500, 1);
      const hue = (1 - normalizedSpeed) * 120; // 120=green, 0=red
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 2;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw arrowhead
      const arrowSize = 8;
      const angle = Math.atan2(m.vy, m.vx);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();

      // Draw speed text
      ctx.font = "10px monospace";
      ctx.fillText(`${speed.toFixed(0)}`, m.x + 5, m.y - 5);
    }
  }

  public addRandomSpeed(marbles: Marble[]): void {
    for (const m of marbles) {
      m.vx += Math.random() * 2 - 1;
      m.vy += Math.random() * 2 - 1;
    }
  }
}
