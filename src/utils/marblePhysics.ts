/**
 * 弹珠物理系统
 * 负责弹珠的运动、碰撞检测和边界处理
 */

import type { Marble } from "./mouseInteraction";

export interface PhysicsConfig {
	fieldWidth: number;
	fieldHeight: number;
	damping?: number; // 空气阻力系数
	restitution?: number; // 碰撞恢复系数
	wallBounce?: number; // 墙壁反弹系数
	minSpeed?: number; // 最小速度
	maxSpeed?: number; // 最大速度
}

export class MarblePhysics {
	private config: PhysicsConfig;

	constructor(config: PhysicsConfig) {
		this.config = {
			fieldWidth: config.fieldWidth,
			fieldHeight: config.fieldHeight,
			damping: config.damping ?? 0.9985,
			restitution: config.restitution ?? 0.92,
			wallBounce: config.wallBounce ?? 0.85,
			minSpeed: config.minSpeed ?? 30,
			maxSpeed: config.maxSpeed ?? 800,
		};
	}

	/**
	 * 更新弹珠位置
	 * @param marbles 弹珠数组
	 * @param dt 时间增量
	 */
	public updatePositions(marbles: Marble[], dt: number): void {
		const { damping, minSpeed, maxSpeed } = this.config;

		for (const m of marbles) {
			// 应用空气阻力
			if (damping !== undefined && damping < 1) {
				const dampingFactor = Math.pow(damping, dt * 60); // 帧率独立
				m.vx *= dampingFactor;
				m.vy *= dampingFactor;
			}

			// 计算当前速度
			const speed = Math.hypot(m.vx, m.vy);

			// 维持最小速度（防止完全静止）
			if (minSpeed !== undefined && speed > 0 && speed < minSpeed) {
				const scale = minSpeed / speed;
				m.vx *= scale;
				m.vy *= scale;
			}

			// 限制最大速度
			if (maxSpeed !== undefined && speed > maxSpeed) {
				const scale = maxSpeed / speed;
				m.vx *= scale;
				m.vy *= scale;
			}

			// 更新位置
			m.x += m.vx * dt;
			m.y += m.vy * dt;
		}
	}

	/**
	 * 处理弹珠之间的碰撞
	 * @param marbles 弹珠数组
	 */
	public handleCollisions(marbles: Marble[]): void {
		const restitution = this.config.restitution ?? 1;

		for (let i = 0; i < marbles.length; i++) {
			for (let j = i + 1; j < marbles.length; j++) {
				const a = marbles[i];
				const b = marbles[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dist = Math.hypot(dx, dy) || 0.001;
				const minDist = a.radius + b.radius;

				if (dist < minDist) {
					const nx = dx / dist;
					const ny = dy / dist;
					const relativeVelocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

					if (relativeVelocity < 0) {
						// 应用恢复系数计算冲量
						const impulse =
							((1 + restitution) * relativeVelocity) / (a.mass + b.mass);
						a.vx -= impulse * b.mass * nx;
						a.vy -= impulse * b.mass * ny;
						b.vx += impulse * a.mass * nx;
						b.vy += impulse * a.mass * ny;
					}

					// 位置校正，防止重叠
					const overlap = minDist - dist + 0.5;
					a.x -= nx * overlap * 0.5;
					a.y -= ny * overlap * 0.5;
					b.x += nx * overlap * 0.5;
					b.y += ny * overlap * 0.5;
				}
			}
		}
	}

	/**
	 * 处理边界碰撞
	 * @param marbles 弹珠数组
	 */
	public handleBoundaries(marbles: Marble[]): void {
		const { fieldWidth, fieldHeight, wallBounce } = this.config;
		const bounce = wallBounce ?? 1;

		for (const m of marbles) {
			// 左边界
			if (m.x - m.radius < 0) {
				m.x = m.radius;
				if (m.vx < 0) m.vx *= -bounce;
			}
			// 右边界
			if (m.x + m.radius > fieldWidth) {
				m.x = fieldWidth - m.radius;
				if (m.vx > 0) m.vx *= -bounce;
			}
			// 上边界
			if (m.y - m.radius < 0) {
				m.y = m.radius;
				if (m.vy < 0) m.vy *= -bounce;
			}
			// 下边界
			if (m.y + m.radius > fieldHeight) {
				m.y = fieldHeight - m.radius;
				if (m.vy > 0) m.vy *= -bounce;
			}
		}
	}

	/**
	 * 渲染弹珠到 DOM
	 * @param marbles 弹珠数组
	 */
	public render(marbles: Marble[]): void {
		for (const m of marbles) {
			m.node.style.transform = `translate(${m.x - m.radius}px, ${
				m.y - m.radius
			}px)`;
		}
	}

	/**
	 * 更新配置
	 * @param config 新的配置
	 */
	public updateConfig(config: Partial<PhysicsConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * 获取当前配置
	 */
	public getConfig(): PhysicsConfig {
		return { ...this.config };
	}
}
