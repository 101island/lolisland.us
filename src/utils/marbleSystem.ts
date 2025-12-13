// Marble system manager: Integrates all subsystems and provides a unified API

import type { UserEntry } from "../config/marbleConfig";
import { MARBLE_CONFIG } from "../config/marbleConfig";
import { DeviceOrientationInteraction } from "./deviceOrientationInteraction";
import { AnimationLoop } from "./animationLoop";
import { MarbleFactory } from "./marbleFactory";
import { MarblePhysics } from "./marblePhysics";
import type { Marble, MouseInteractionConfig } from "./mouseInteraction";
import { MouseInteraction } from "./mouseInteraction";

export interface MarbleSystemConfig {
  container: HTMLElement;
  fieldWidth: number;
  fieldHeight: number;
  mouseInteractionConfig?: {
    attractRadius?: number;
    repelRadius?: number;
    repelForce?: number;
    attractForce?: number;
  };
  deviceOrientationConfig?: {
    sensitivity?: number;
    maxForce?: number;
  };
}

export class MarbleSystem {
  private container: HTMLElement;
  private marbles: Marble[] = [];

  // Subsystems
  private mouseInteraction: MouseInteraction;
  private deviceOrientationInteraction: DeviceOrientationInteraction;
  private physics: MarblePhysics;
  private factory: MarbleFactory;
  private animationLoop: AnimationLoop;

  // Field dimensions
  private fieldWidth: number;
  private fieldHeight: number;

  // Debug mode
  private debugMode: boolean = MARBLE_CONFIG.debug.enabled;
  private debugCanvas: HTMLCanvasElement | null = null;

  constructor(config: MarbleSystemConfig) {
    this.container = config.container;
    this.fieldWidth = config.fieldWidth;
    this.fieldHeight = config.fieldHeight;

    // Debug Canvas Init
    if (MARBLE_CONFIG.debug.enabled) {
      this.debugCanvas = document.getElementById(
        MARBLE_CONFIG.debug.canvasId,
      ) as HTMLCanvasElement | null;
      if (this.debugCanvas) {
        this.debugCanvas.width = this.fieldWidth;
        this.debugCanvas.height = this.fieldHeight;
      }
    }

    // MouseInteraction Init
    const mouseConfig: MouseInteractionConfig = {
      attractRadius:
        config.mouseInteractionConfig?.attractRadius ??
        MARBLE_CONFIG.mouseInteraction.attractRadius,
      repelRadius:
        config.mouseInteractionConfig?.repelRadius ??
        MARBLE_CONFIG.mouseInteraction.repelRadius,
      repelForce:
        config.mouseInteractionConfig?.repelForce ??
        MARBLE_CONFIG.mouseInteraction.repelForce,
      attractForce:
        config.mouseInteractionConfig?.attractForce ??
        MARBLE_CONFIG.mouseInteraction.attractForce,
    };
    this.mouseInteraction = new MouseInteraction(mouseConfig);
    this.mouseInteraction.init();

    // DeviceOrientationInteraction Init
    this.deviceOrientationInteraction = new DeviceOrientationInteraction({
      sensitivity:
        config.deviceOrientationConfig?.sensitivity ??
        MARBLE_CONFIG.deviceOrientation.sensitivity,
      maxForce:
        config.deviceOrientationConfig?.maxForce ??
        MARBLE_CONFIG.deviceOrientation.maxForce,
    });

    this.deviceOrientationInteraction.init();
    // MarblePhysics Init
    this.physics = new MarblePhysics({
      fieldWidth: this.fieldWidth,
      fieldHeight: this.fieldHeight,
      damping: MARBLE_CONFIG.physics.damping,
      restitution: MARBLE_CONFIG.physics.restitution,
      wallBounce: MARBLE_CONFIG.physics.wallBounce,
      minSpeed: MARBLE_CONFIG.physics.minSpeed,
      maxSpeed: MARBLE_CONFIG.physics.maxSpeed,
      debugCanvas: this.debugCanvas,
      debugVectorScale: MARBLE_CONFIG.debug.vectorScale,
    });

    // MarbleFactory Init
    this.factory = new MarbleFactory(
      this.container,
      this.fieldWidth,
      this.fieldHeight,
    );

    // AnimationLoop Init
    this.animationLoop = new AnimationLoop(
      this.update.bind(this),
      MARBLE_CONFIG.animation.fixedDeltaTime,
      MARBLE_CONFIG.animation.maxFrameTime,
    );

    // Setup window resize handler
    this.setupResizeHandler();
  }

  // Per-frame update logic
  private update(dt: number): void {
    // Apply mouse force field
    for (const marble of this.marbles) {
      if (this.mouseInteraction.shouldApplyForce(marble)) {
        this.mouseInteraction.applyForce(marble, dt);
      }
    }

    // Apply device motion force
    if (this.deviceOrientationInteraction.isSupported()) {
      this.deviceOrientationInteraction.applyForce(this.marbles, dt);
    }

    // Update physics
    this.physics.updatePositions(this.marbles, dt);
    this.physics.handleCollisions(this.marbles);
    this.physics.handleBoundaries(this.marbles);
    this.physics.render(this.marbles);

    // Render debug vectors if enabled
    if (this.debugMode) {
      this.physics.renderDebugVectors(this.marbles);
    }
  }

  // Set up window resize listener
  private setupResizeHandler(): void {
    window.addEventListener("resize", () => {
      this.fieldWidth = window.innerWidth;
      this.fieldHeight = window.innerHeight;
      this.physics.updateConfig({
        fieldWidth: this.fieldWidth,
        fieldHeight: this.fieldHeight,
      });
      this.factory.updateFieldSize(this.fieldWidth, this.fieldHeight);
    });
  }

  // Add a single marble
  public async addMarble(entry: UserEntry): Promise<Marble> {
    const marble = await this.factory.createMarble(entry);
    this.marbles.push(marble);
    return marble;
  }

  // Batch add marbles
  public async addMarbles(entries: UserEntry[]): Promise<Marble[]> {
    const newMarbles = await this.factory.createMarbles(entries);
    this.marbles.push(...newMarbles);
    return newMarbles;
  }

  // Remove marble
  public removeMarble(marbleId: string): boolean {
    const index = this.marbles.findIndex((m) => m.id === marbleId);
    if (index === -1) return false;

    const marble = this.marbles[index];
    marble.node.remove();
    this.marbles.splice(index, 1);
    return true;
  }

  // Clear all marbles
  public clear(): void {
    for (const marble of this.marbles) {
      marble.node.remove();
    }
    this.marbles = [];
  }

  // Start animation
  public start(): void {
    this.animationLoop.start();
  }

  // Stop animation
  public stop(): void {
    this.animationLoop.stop();
  }

  // Pause animation
  public pause(): void {
    this.animationLoop.pause();
  }

  // Resume animation
  public resume(): void {
    this.animationLoop.resume();
  }

  // Get all marbles
  public getMarbles(): ReadonlyArray<Marble> {
    return this.marbles;
  }

  // Get marble count
  public getMarbleCount(): number {
    return this.marbles.length;
  }

  // Update marble size (zoom)
  public updateMarbleSize(zoomLevel: number): void {
    this.factory.setZoomLevel(zoomLevel);
    const size = this.calculateMarbleSize(zoomLevel);
    const radius = size / 2;

    for (const m of this.marbles) {
      m.radius = radius;
      m.node.style.width = `${size}px`;
      m.node.style.height = `${size}px`;
      // Recalculate mass
      const { massScale, massOffset } = MARBLE_CONFIG.physics;
      m.mass = radius * radius * massScale + massOffset;
    }
  }

  // Calculate marble size
  private calculateMarbleSize(zoomLevel: number): number {
    const { base, min, maxScreenRatio } = MARBLE_CONFIG.size;
    const quarter =
      Math.min(window.innerWidth, window.innerHeight) * maxScreenRatio;
    const capped = Math.min(base, quarter || base);
    return Math.max(min, Math.floor(capped)) * zoomLevel;
  }

  /**
   * Request device motion permission
   */
  public async requestDeviceOrientationPermission(): Promise<boolean> {
    return this.deviceOrientationInteraction.requestPermission();
  }

  /**
   * Get device motion debug info see also MainView.astro
   */
  // public getDeviceOrientationDebugInfo() {
  //   return this.deviceOrientationInteraction.getDebugInfo();
  // }

  // Destroy system
  public destroy(): void {
    this.stop();
    this.clear();
  }

  // Toggle collision
  public setCollisions(enabled: boolean): void {
    this.physics.updateConfig({ enableCollisions: enabled });
  }

  // Toggle debug mode (show velocity vectors)
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;

    // Get canvas from DOM if not already cached
    if (!this.debugCanvas) {
      this.debugCanvas = document.getElementById(
        MARBLE_CONFIG.debug.canvasId,
      ) as HTMLCanvasElement | null;
    }

    if (this.debugCanvas) {
      if (enabled) {
        // Show canvas and configure physics
        this.debugCanvas.style.display = "block";
        this.debugCanvas.width = this.fieldWidth;
        this.debugCanvas.height = this.fieldHeight;
        this.physics.updateConfig({ debugCanvas: this.debugCanvas });
      } else {
        // Hide canvas and clear
        this.debugCanvas.style.display = "none";
        const ctx = this.debugCanvas.getContext("2d");
        if (ctx)
          ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
        this.physics.updateConfig({ debugCanvas: null });
      }
    }
  }

  // Get debug mode status
  public isDebugMode(): boolean {
    return this.debugMode;
  }
}
