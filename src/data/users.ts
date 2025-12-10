/**
 * 用户数据
 * 从 API 获取用户列表并存储
 */

import type { UserEntry } from "../config/marbleConfig";

export const USER_DATA_API = "https://avatar.awfufu.com/users";

/**
 * 从 API 获取用户数据
 */
export async function fetchUsers(): Promise<UserEntry[]> {
	try {
		const response = await fetch(USER_DATA_API);
		if (!response.ok) {
			throw new Error(`Failed to fetch users: ${response.statusText}`);
		}
		return await response.json();
	} catch (error) {
		console.error("Failed to fetch users:", error);
		return [];
	}
}
