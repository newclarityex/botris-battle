import { z } from "zod";
import { PlayerInfo, PublicPlayerData, PublicRoomData } from "./rooms";
import { GameEvent, GameState, PublicGameState } from "libtris";

export const AuthSchema = z.object({
	type: z.literal("auth"),
	payload: z.object({
		userToken: z.string(),
		roomToken: z.string(),
	}),
});

export const GeneralMessageSchema = z.union([
	z.object({
		type: z.literal("start_game"),
	}),
	z.object({
		type: z.literal("reset_game"),
	}),
	z.object({
		type: z.literal("kick"),
		payload: z.object({
			sessionId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("ban"),
		payload: z.object({
			userId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("unban"),
		payload: z.object({
			userId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("transfer_host"),
		payload: z.object({
			userId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("room_settings"),
		payload: z.object({
			private: z.boolean(),
			ft: z.number().int().gt(0).max(99),
			ppsCap: z.number().min(0.1).max(30),
		}),
	}),
]);

export type ClientMessage =
	| z.infer<typeof GeneralMessageSchema>
	| z.infer<typeof AuthSchema>;

export const PlayerMessageSchema = z.object({
	type: z.literal("commands"),
	payload: z.object({
		commands: z
			.union([
				z.literal("move_left"),
				z.literal("move_right"),
				z.literal("sonic_left"),
				z.literal("sonic_right"),
				z.literal("drop"),
				z.literal("sonic_drop"),
				z.literal("hard_drop"),
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
		type: "request_move";
		payload: {
			gameState: PublicGameState;
			players: PublicPlayerData[];
		};
	}
	| {
		type: "game_info";
		payload: {
			roomData: PublicRoomData;
			players: PublicPlayerData[];
		};
	}
	| {
		type: "room_info";
		payload: PublicRoomData;
	}
	| {
		type: "settings_changed";
		payload: PublicRoomData;
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
			players: PublicPlayerData[];
			roomData: PublicRoomData;
		};
	}
	| {
		type: "game_reset";
		payload: {
			players: PublicPlayerData[];
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
	} | {
		type: "player_banned";
		payload: PlayerInfo;
	} | {
		type: "player_unbanned";
		payload: PlayerInfo;
	}
	| {
		type: "player_commands";
		payload: {
			sessionId: string;
			commands: string[];
			gameState: PublicGameState;
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
		type: "player_died";
		payload: {
			sessionId: string;
		};
	}
	| {
		type: "round_over";
		payload: {
			winnerId: string;
			roomData: PublicRoomData;
		};
	}
	| {
		type: "game_over";
		payload: {
			winnerId: string;
			roomData: PublicRoomData;
		};
	};
