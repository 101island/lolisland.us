/**
 * 弹珠工厂
 * 负责创建和初始化弹珠实例
 */

import type { Marble } from "./mouseInteraction";
import type { UserEntry } from "../config/marbleConfig";
import { MARBLE_CONFIG, AVATAR_BASE_URL } from "../config/marbleConfig";

export class MarbleFactory {
	private container: HTMLElement;
	private fieldWidth: number;
	private fieldHeight: number;

	constructor(container: HTMLElement, fieldWidth: number, fieldHeight: number) {
		this.container = container;
		this.fieldWidth = fieldWidth;
		this.fieldHeight = fieldHeight;
	}

	/**
	 * 计算弹珠大小（响应式）
	 */
	private calculateMarbleSize(): number {
		const { base, min, maxScreenRatio } = MARBLE_CONFIG.size;
		const quarter =
			Math.min(window.innerWidth, window.innerHeight) * maxScreenRatio;
		const capped = Math.min(base, quarter || base);
		return Math.max(min, Math.floor(capped));
	}

	/**
	 * 生成头像 URL
	 */
	private getAvatarUrl(id: string): string {
		return `${AVATAR_BASE_URL}${id}`;
	}

	/**
	 * 创建弹珠 DOM 节点
	 */
	private createMarbleNode(
		entry: UserEntry,
		size: number,
		url: string
	): HTMLAnchorElement {
		const node = document.createElement("a");
		node.className = "marble";
		node.style.opacity = "0";
		node.style.width = `${size}px`;
		node.style.height = `${size}px`;

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

		return node;
	}

	/**
	 * 生成随机位置和速度
	 */
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

	/**
	 * 创建弹珠（异步加载图片）
	 */
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
				const node = this.createMarbleNode(entry, size, url);
				const physics = this.generateRandomPhysics(radius);

				const { massScale, massOffset } = MARBLE_CONFIG.physics;
				const marble: Marble = {
					id: entry.id,
					node,
					x: physics.x,
					y: physics.y,
					vx: physics.vx,
					vy: physics.vy,
					radius,
					mass: radius * radius * massScale + massOffset,
				};

				this.container.appendChild(node);

				// 淡入动画
				setTimeout(() => {
					node.style.opacity = "1";
				}, MARBLE_CONFIG.animation.fadeInDelay);

				resolve(marble);
			};

			img.onerror = () => {
				reject(new Error(`Failed to load image: ${url}`));
			};

			img.src = url;
		});
	}

	/**
	 * 批量创建弹珠
	 */
	public async createMarbles(entries: UserEntry[]): Promise<Marble[]> {
		const results = await Promise.allSettled(
			entries.map((entry) => this.createMarble(entry))
		);

		const marbles: Marble[] = [];
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === "fulfilled") {
				marbles.push(result.value);
			} else {
				console.warn(
					`Failed to create marble for ${entries[i].name}:`,
					result.reason
				);
			}
		}

		return marbles;
	}

	/**
	 * 更新场地尺寸
	 */
	public updateFieldSize(width: number, height: number): void {
		this.fieldWidth = width;
		this.fieldHeight = height;
	}
}
