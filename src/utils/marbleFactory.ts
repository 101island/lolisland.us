// Marble factory: Responsible for creating and initializing marble instances

import type { UserEntry } from "../config/marbleConfig";
import { AVATAR_BASE_URL, MARBLE_CONFIG } from "../config/marbleConfig";
import type { Marble } from "./mouseInteraction";

export class MarbleFactory {
  private container: HTMLElement;
  private fieldWidth: number;
  private fieldHeight: number;
  private zoomLevel: number = 1.0;

  constructor(container: HTMLElement, fieldWidth: number, fieldHeight: number) {
    this.container = container;
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
  }

  // Calculate marble size (responsive)
  public calculateMarbleSize(): number {
    const { base, min, marbleCount, marbleArea } = MARBLE_CONFIG.size;
    const fieldArea = this.fieldWidth * this.fieldHeight;
    const areaPerMarble = (fieldArea * marbleArea) / marbleCount;
    const quarter = Math.sqrt((4 * areaPerMarble) / Math.PI);
    const capped = Math.min(base, quarter || base);
    return Math.max(min, Math.floor(capped)) * this.zoomLevel;
  }

  // Generate avatar URL
  private getAvatarUrl(id: string): string {
    return `${AVATAR_BASE_URL}${id}`;
  }

  // Create marble DOM node wrapper
  private createMarbleWrapper(
    entry: UserEntry,
    size: number,
    url: string,
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "marble-wrapper";
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;
    wrapper.style.opacity = "0";

    const node = document.createElement("a");
    node.className = "marble";

    if (entry.link) {
      node.href = entry.link;
      node.target = "_blank";
    } else {
      node.removeAttribute("href");
      node.style.cursor = "default";
    }

    node.style.backgroundImage = `url("${url}")`;

    const label = document.createElement("div");
    label.className = "marble-label";
    label.textContent = entry.name || entry.id;
    node.appendChild(label);

    wrapper.appendChild(node);

    return wrapper;
  }

  // Generate random position and velocity
  private generateRandomPhysics(radius: number) {
    const { min, max } = MARBLE_CONFIG.speed;
    const startX = Math.random() * (this.fieldWidth - radius * 2) + radius;
    const startY = Math.random() * (this.fieldHeight - radius * 2) + radius;
    const speed = min + Math.random() * (max - min);
    const angle = Math.random() * Math.PI * 2;

    return {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  // Create marble (async image loading)
  public async createMarble(entry: UserEntry): Promise<Marble> {
    return new Promise((resolve, reject) => {
      if (!entry?.id) {
        reject(new Error("Invalid user entry"));
        return;
      }

      const url = this.getAvatarUrl(entry.id);
      const img = new Image();

      img.onload = () => {
        const size = this.calculateMarbleSize();
        const radius = size / 2;
        const wrapper = this.createMarbleWrapper(entry, size, url);
        const physics = this.generateRandomPhysics(radius);

        const { massScale, massOffset } = MARBLE_CONFIG.physics;
        const marble: Marble = {
          id: entry.id,
          node: wrapper,
          x: physics.x,
          y: physics.y,
          vx: physics.vx,
          vy: physics.vy,
          radius,
          mass: radius * radius * massScale + massOffset,
        };

        this.container.appendChild(wrapper);

        // Fade in animation
        setTimeout(() => {
          wrapper.style.opacity = "1";
        }, MARBLE_CONFIG.animation.fadeInDelay);

        resolve(marble);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  // Batch create marbles
  public async createMarbles(entries: UserEntry[]): Promise<Marble[]> {
    const results = await Promise.allSettled(
      entries.map((entry) => this.createMarble(entry)),
    );

    const marbles: Marble[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        marbles.push(result.value);
      } else {
        console.warn(
          `Failed to create marble for ${entries[i].name}:`,
          result.reason,
        );
      }
    }

    return marbles;
  }

  // Update field size
  public updateFieldSize(width: number, height: number): void {
    this.fieldWidth = width;
    this.fieldHeight = height;
  }

  // Set zoom level
  public setZoomLevel(zoom: number): void {
    this.zoomLevel = zoom;
  }

  // Get current zoom level
  public getZoomLevel(): number {
    return this.zoomLevel;
  }
}
