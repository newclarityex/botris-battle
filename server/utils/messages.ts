import { z } from "zod";
import { PlayerInfo } from "./rooms";
import { GameState } from "libtris";

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
			playerId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("ban"),
		payload: z.object({
			playerId: z.string(),
		}),
	}),
	z.object({
		type: z.literal("unban"),
		payload: z.object({
			playerId: z.string(),
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
	| {
			type: "game_started";
	  }
	| {
			type: "game_reset";
	  }
	| {
			type: "player_joined";
			payload: {
				info: PlayerInfo;
			};
	  }
	| {
			type: "player_left";
			payload: {
				playerId: string;
			};
	  }
	| {
			type: "player_ready";
			payload: {
				playerId: string;
			};
	  }
	| {
			type: "player_unready";
			payload: {
				playerId: string;
			};
	  }
	| {
			type: "player_commands";
			payload: {
				sessionId: string;
				commands: string[];
				newGameState: GameState;
			};
	  }
	| {
			type: "player_damage_received";
			payload: {
				playerId: string;
				damage: number;
			};
	  }
	| {
			type: "game_over";
			payload: {
				winnerId: string;
			};
	  };
