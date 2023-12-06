import { z } from "zod";
import { PlayerInfo, PublicPlayerData, PublicRoomData } from "./rooms";
import { GameEvent, GameState, PublicGameState } from "libtris";

export const AuthSchema = z.object({
	type: z.literal("auth"),
	payload: z.object({
		token: z.string(),
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
			public: z.boolean(),
			ft: z.number(),
			maxPlayers: z.number(),
		}),
	}),
]);

export type ClientMessage =
	| z.infer<typeof GeneralMessageSchema>
	| z.infer<typeof AuthSchema>;

export const PlayerMessageSchema = z.union([
	z.object({
		type: z.literal("ready"),
	}),
	z.object({
		type: z.literal("unready"),
	}),
	z.object({
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
	}),
]);

export type PlayerMessage = z.infer<typeof PlayerMessageSchema>;

export type GeneralServerMessage =
	{
		type: 'request_move';
		payload: {
			gameState: PublicGameState;
			players: PublicPlayerData[];
		};
	} |
	{
		type: "game_info";
		payload: {
			publicRoomData: PublicRoomData;
			players: PublicPlayerData[];
		};
	} |
	{
		type: "room_info";
		payload: {
			publicRoomData: PublicRoomData;
		};
	} |
	{
		type: "settings_changed";
		payload: {
			publicRoomData: PublicRoomData;
		};
	} |
	{
		type: "host_changed";
		payload: {
			hostInfo: PlayerInfo;
		};
	}
	| {
		type: "all_ready";
	}
	| {
		type: "game_started";
	}
	| {
		type: "round_started";
		payload: {
			startsAt: number;
			players: PublicPlayerData[];
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
	}
	| {
		type: "player_ready";
		payload: {
			sessionId: string;
		};
	}
	| {
		type: "player_unready";
		payload: {
			sessionId: string;
		};
	}
	| {
		type: "player_update";
		payload: {
			sessionId: string;
			commands: string[];
			newGameState: PublicGameState;
			events: GameEvent[];
		};
	}
	| {
		type: "player_commands";
		payload: {
			sessionId: string;
			commands: string[];
			newGameState: PublicGameState;
			events: GameEvent[];
		};
	}
	| {
		type: "player_damage_received";
		payload: {
			sessionId: string;
			damage: number;
			newGameState: PublicGameState;
		};
	}
	| {
		type: "player_died";
		payload: {
			userId: string;
		};
	}
	| {
		type: "round_over";
		payload: {
			winnerId: string;
		}
	}
	| {
		type: "game_over";
		payload: {
			winnerId: string;
		};
	};
