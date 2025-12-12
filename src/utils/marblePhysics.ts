import type { Marble } from "./mouseInteraction";
// @ts-ignore
import init, { PhysicsWorld, PhysicsConfig as WasmPhysicsConfig } from "../wasm/marble-physics/pkg/marble_physics.js";

export interface PhysicsConfig {
  fieldWidth: number;
  fieldHeight: number;
  damping?: number;
  restitution?: number;
  wallBounce?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

export class MarblePhysics {
  private config: PhysicsConfig;
  private world: PhysicsWorld | null = null;
  private wasmMemory: WebAssembly.Memory | null = null;
  private isReady = false;

  constructor(config: PhysicsConfig) {
    this.config = config;
  }

  public async init(): Promise<void> {
    const wasm = await init();
    this.wasmMemory = wasm.memory;

    const canvasWidth = this.config.fieldWidth;
    const canvasHeight = this.config.fieldHeight;

    const wasmConfig = WasmPhysicsConfig.new(
      canvasWidth,
      canvasHeight,
      this.config.damping ?? 0.9985,
      this.config.restitution ?? 0.92,
      this.config.wallBounce ?? 0.85,
      this.config.minSpeed ?? 30,
      this.config.maxSpeed ?? 800
    );

    this.world = PhysicsWorld.new(wasmConfig);
    this.isReady = true;
  }

  public updatePositions(marbles: Marble[], dt: number): void {
    if (!this.world || !this.isReady || !this.wasmMemory) return;

    // Sync JS marbles to WASM (only if needed, e.g. added/removed or modified externally)
    // For now, simpler approach: Re-create world content if count mismatch
    // Optimization: Maintain a mapping or only add new ones. 
    // BUT since current `marbleSystem` manages the array, we need to be careful.
    // If we want O(N^2) in WASM, WASM MUST have all marbles.

    // Check if we need to sync state FROM JS TO WASM (e.g. mouse interaction changed velocity)
    // Or if we need to sync structure.

    // To keep it performant and simple for this migration:
    // We will assume WASM has the authoritative state for position/velocity.
    // However, MouseInteraction modifies JS objects. We need to copy JS -> WASM before step.
    // And WASM -> JS after step.

    // 1. Sync JS -> WASM
    // This copy is O(N).
    // If we have a lot of marbles, this might be slow, but much faster than N^2 physics.

    // But wait, allocating/deallocating in WASM every frame is bad.
    // We should maintain the marbles in WASM.
    // `marbleSystem` adds marbles one by one.

    // Let's change the pattern:
    // `updatePositions` implies moving them.
    // `handleCollisions` implies colliding them.

    // We can do `world.clear_marbles()` and `world.add_marble(...)` every frame?
    // 500 marbles * call overhead. Might be okay for simple WASM.

    this.world.clear_marbles();
    for (const m of marbles) {
      this.world.add_marble(m.x, m.y, m.vx, m.vy, m.radius, m.mass);
    }

    // 2. Step
    this.world.step(dt);

    // 3. Sync WASM -> JS
    const ptr = this.world.get_marbles_ptr();
    const len = this.world.get_marbles_len();
    const float64Array = new Float64Array(this.wasmMemory.buffer, ptr, len * 6);

    for (let i = 0; i < len; i++) {
      const base = i * 6;
      const m = marbles[i]; // strict order assumption
      m.x = float64Array[base + 0];
      m.y = float64Array[base + 1];
      m.vx = float64Array[base + 2];
      m.vy = float64Array[base + 3];
      // radius and mass shouldn't change in physics step
    }
  }

  public handleCollisions(marbles: Marble[]): void {
    // Handled in updatePositions (WASM step covers both)
  }

  public handleBoundaries(marbles: Marble[]): void {
    // Handled in updatePositions (WASM step covers both)
  }

  public render(marbles: Marble[]): void {
    for (const m of marbles) {
      m.node.style.transform = `translate(${m.x - m.radius}px, ${m.y - m.radius}px)`;
    }
  }

  public updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.world) {
      // Need to create new config object for WASM
      const wasmConfig = WasmPhysicsConfig.new(
        this.config.fieldWidth,
        this.config.fieldHeight,
        this.config.damping ?? 0.9985,
        this.config.restitution ?? 0.92,
        this.config.wallBounce ?? 0.85,
        this.config.minSpeed ?? 30,
        this.config.maxSpeed ?? 800
      );
      this.world.update_config(wasmConfig);
    }
  }
}
