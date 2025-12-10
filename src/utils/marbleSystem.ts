/**
 * 弹珠系统管理器
 * 整合所有子系统，提供统一的 API
 */

import type { Marble, MouseInteractionConfig } from "./mouseInteraction";
import type { UserEntry } from "../config/marbleConfig";
import { MouseInteraction } from "./mouseInteraction";
import { MarblePhysics } from "./marblePhysics";
import { MarbleFactory } from "./marbleFactory";
import { AnimationLoop } from "./animationLoop";
import { MARBLE_CONFIG } from "../config/marbleConfig";

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
}

export class MarbleSystem {
	private container: HTMLElement;
	private marbles: Marble[] = [];

	// 子系统
	private mouseInteraction: MouseInteraction;
	private physics: MarblePhysics;
	private factory: MarbleFactory;
	private animationLoop: AnimationLoop;

	// 场地尺寸
	private fieldWidth: number;
	private fieldHeight: number;

	constructor(config: MarbleSystemConfig) {
		this.container = config.container;
		this.fieldWidth = config.fieldWidth;
		this.fieldHeight = config.fieldHeight;

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

		// MarblePhysics Init
		this.physics = new MarblePhysics({
			fieldWidth: this.fieldWidth,
			fieldHeight: this.fieldHeight,
			damping: MARBLE_CONFIG.physics.damping,
			restitution: MARBLE_CONFIG.physics.restitution,
			wallBounce: MARBLE_CONFIG.physics.wallBounce,
			minSpeed: MARBLE_CONFIG.physics.minSpeed,
			maxSpeed: MARBLE_CONFIG.physics.maxSpeed,
		});

		// MarbleFactory Init
		this.factory = new MarbleFactory(
			this.container,
			this.fieldWidth,
			this.fieldHeight
		);

		// AnimationLoop Init
		this.animationLoop = new AnimationLoop(
			this.update.bind(this),
			MARBLE_CONFIG.animation.fixedDeltaTime,
			MARBLE_CONFIG.animation.maxFrameTime
		);

		// 监听窗口大小变化
		this.setupResizeHandler();
	}

	/**
	 * 每帧更新逻辑
	 */
	private update(dt: number): void {
		// 应用鼠标力场
		for (const marble of this.marbles) {
			if (this.mouseInteraction.shouldApplyForce(marble)) {
				this.mouseInteraction.applyForce(marble, dt);
			}
		}

		// 更新物理
		this.physics.updatePositions(this.marbles, dt);
		this.physics.handleCollisions(this.marbles);
		this.physics.handleBoundaries(this.marbles);
		this.physics.render(this.marbles);
	}

	/**
	 * 设置窗口大小变化监听
	 */
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

	/**
	 * 添加单个弹珠
	 */
	public async addMarble(entry: UserEntry): Promise<Marble> {
		const marble = await this.factory.createMarble(entry);
		this.marbles.push(marble);
		return marble;
	}

	/**
	 * 批量添加弹珠
	 */
	public async addMarbles(entries: UserEntry[]): Promise<Marble[]> {
		const newMarbles = await this.factory.createMarbles(entries);
		this.marbles.push(...newMarbles);
		return newMarbles;
	}

	/**
	 * 移除弹珠
	 */
	public removeMarble(marbleId: string): boolean {
		const index = this.marbles.findIndex((m) => m.id === marbleId);
		if (index === -1) return false;

		const marble = this.marbles[index];
		marble.node.remove();
		this.marbles.splice(index, 1);
		return true;
	}

	/**
	 * 清空所有弹珠
	 */
	public clear(): void {
		for (const marble of this.marbles) {
			marble.node.remove();
		}
		this.marbles = [];
	}

	/**
	 * 启动动画
	 */
	public start(): void {
		this.animationLoop.start();
	}

	/**
	 * 停止动画
	 */
	public stop(): void {
		this.animationLoop.stop();
	}

	/**
	 * 暂停动画
	 */
	public pause(): void {
		this.animationLoop.pause();
	}

	/**
	 * 恢复动画
	 */
	public resume(): void {
		this.animationLoop.resume();
	}

	/**
	 * 获取所有弹珠
	 */
	public getMarbles(): ReadonlyArray<Marble> {
		return this.marbles;
	}

	/**
	 * 获取弹珠数量
	 */
	public getMarbleCount(): number {
		return this.marbles.length;
	}

	/**
	 * 销毁系统
	 */
	public destroy(): void {
		this.stop();
		this.clear();
	}
}
