import { z } from "zod";
import type { PlayerInfo, PublicPlayerData, PublicRoomData } from "./rooms";
import type { GameEvent, PublicGameState } from "libtris";

export const AuthSchema = z.object({
	type: z.literal("auth"),
	payload: z.object({
		userToken: z.string(),
		roomToken: z.string(),
	}),
});

export type ClientMessage = z.infer<typeof AuthSchema>;

export const PlayerMessageSchema = z.object({
	type: z.literal("action"),
	payload: z.object({
		commands: z
			.union([
				z.literal("move_left"),
				z.literal("move_right"),
				z.literal("sonic_left"),
				z.literal("sonic_right"),
				z.literal("drop"),
				z.literal("sonic_drop"),
				z.literal("rotate_cw"),
				z.literal("rotate_ccw"),
				z.literal("hold"),
			])
			.array(),
	}),
});

export type PlayerMessage = z.infer<typeof PlayerMessageSchema>;

export type GeneralServerMessage =
	| {
		type: "room_data";
		payload: {
			roomData: PublicRoomData
		};
	}
	| {
		type: "player_joined";
		payload: {
			playerData: PublicPlayerData;
		};
	}
	| {
		type: "player_left";
		payload: {
			sessionId: string;
		};
	}
	| {
		type: "player_banned";
		payload: {
			playerInfo: PlayerInfo
		};
	}
	| {
		type: "player_unbanned";
		payload: {
			playerInfo: PlayerInfo
		};
	}
	| {
		type: "settings_changed";
		payload: {
			roomData: PublicRoomData
		};
	}
	| {
		type: "host_changed";
		payload: {
			hostInfo: PlayerInfo;
		};
	}
	| {
		type: "game_started";
	}
	| {
		type: "round_started";
		payload: {
			startsAt: number;
			roomData: PublicRoomData;
		};
	}
	| {
		type: "request_move";
		payload: {
			gameState: PublicGameState;
			players: PublicPlayerData[];
		};
	}
	| {
		type: "player_action";
		payload: {
			sessionId: string;
			commands: string[];
			gameState: PublicGameState;
			prevGameState: PublicGameState;
			requestDelay: number;
			events: GameEvent[];
		};
	}
	| {
		type: "player_damage_received";
		payload: {
			sessionId: string;
			damage: number;
			gameState: PublicGameState;
		};
	}
	| {
		type: "round_over";
		payload: {
			winnerId: string;
			winnerInfo: PlayerInfo;
			roomData: PublicRoomData;
		};
	}
	| {
		type: "game_over";
		payload: {
			winnerId: string;
			winnerInfo: PlayerInfo;
			roomData: PublicRoomData;
		};
	}
	| {
		type: "game_reset";
		payload: {
			roomData: PublicRoomData;
		};
	};
// | {
// 	type: "game_info";
// 	payload: {
// 		roomData: PublicRoomData;
// 		players: PublicPlayerData[];
// 	};
// }
// | {
// 	type: "player_died";
// 	payload: {
// 		sessionId: string;
// 	};
// };
