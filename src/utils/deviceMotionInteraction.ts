/**
 * Device motion interaction system
 * Handles the effect of device tilt (acceleration) on marbles
 */

import type { Marble } from "./mouseInteraction";

export interface DeviceMotionConfig {
  sensitivity: number;
  maxForce: number;
}

export class DeviceMotionInteraction {
  private ax: number = 0;
  private ay: number = 0;
  private isActive: boolean = false;
  private config: DeviceMotionConfig;

  constructor(config: DeviceMotionConfig) {
    this.config = config;
  }

  /**
   * Initialize device motion listener
   */
  public init(): void {
    if (typeof window === "undefined") return;

    // Check if DeviceMotionEvent is supported
    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", this.handleMotion.bind(this));
      this.isActive = true;
    }
  }

  /**
   * Handle device motion event
   */
  private handleMotion(event: DeviceMotionEvent): void {
    // x axis acceleration
    // y axis acceleration
    const accel = event.acceleration;
    if (accel) {
      this.ax = -(accel.x || 0);
      this.ay = accel.y || 0;
    }
  }

  /**
   * Get Debug Info
   */
  public getDebugInfo(): {
    motionSupported: boolean;
    motionActive: boolean;
    motionAx: string;
    motionAy: string;
  } {
    return {
      motionActive: this.isActive,
      motionSupported:
        typeof window !== "undefined" && !!window.DeviceMotionEvent,
      motionAx: this.ax.toFixed(2),
      motionAy: this.ay.toFixed(2),
    };
  }

  /**
   * Get whether supported and active
   */
  public isActivated(): boolean {
    return this.isActive;
  }

  /**
   * Request Permission（iOS 13+）
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === "granted") {
          this.init();
          return true;
        }
        return false;
      } catch (e) {
        console.error("DeviceMotion permission error:", e);
        return false;
      }
    }
    return true; // Non iOS 13+ devices do not require a request
  }

  /**
   * Apply Force
   */
  public applyForce(marbles: Marble[], dt: number): void {
    if (!this.isActive) return;
    // Threshold filtering to prevent jitter
    if (Math.abs(this.ax) < 0.5 && Math.abs(this.ay) < 0.5) return;

    const { sensitivity, maxForce } = this.config;

    // Calculate force
    // ax, ay unit is m/s^2
    // times sensitivity
    let fx = this.ax * sensitivity;
    let fy = this.ay * sensitivity;

    // Limit max force
    const force = Math.hypot(fx, fy);
    if (force > maxForce) {
      const scale = maxForce / force;
      fx *= scale;
      fy *= scale;
    }

    // Apply to all marbles
    for (const m of marbles) {
      // m.vx += fx;
      // m.vy += fy;
      m.vx += fx * dt;
      m.vy += fy * dt;
      // console.log("fx", fx, "fy", fy, "dt", dt);
    }
  }

  /**
   * Update Config
   */
  public updateConfig(config: Partial<DeviceMotionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
