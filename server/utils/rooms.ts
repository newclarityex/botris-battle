import type { WebSocket } from "ws";
import { getPublicGameState, type GameState, type PublicGameState, createGameState } from "libtris";
import type { GeneralServerMessage } from "./messages";
import type { Block } from "~/utils/game";
import { customAlphabet } from "nanoid";
import { numbers, lowercase } from "nanoid-dictionary";

export type PlayerInfo = {
	userId: string;
	creator: string;
	bot: string;
	avatar: Block[][];
};

export type PlayerData = {
	sessionId: string;
	playing: boolean;
	ws: WebSocket;
	wins: number;
	gameState: GameState | null;
	info: PlayerInfo;
	moveRequested: boolean;
	lastRequestTimestamp: number;
	timeout: NodeJS.Timeout | null;
};

export type PublicPlayerData = {
	sessionId: string;
	playing: boolean;
	info: PlayerInfo;
	wins: number;
	gameState: PublicGameState | null;
};

export type RoomData = {
	id: string;
	createdAt: number;
	host: PlayerInfo;
	private: boolean;
	ft: number;
	pps: number;
	initialMultiplier: number;
	finalMultiplier: number;
	startMargin: number;
	endMargin: number;
	maxPlayers: number;
	gameOngoing: boolean;
	roundOngoing: boolean;
	startedAt: number | null;
	endedAt: number | null;
	lastWinner: string | null;
	banned: Map<string, PlayerInfo>;
	players: Map<string, PlayerData>;
	spectators: Map<string, WebSocket>;
};

export type PublicRoomData = {
	id: string;
	host: PlayerInfo;
	private: boolean;
	ft: number;
	pps: number;
	initialMultiplier: number;
	finalMultiplier: number;
	startMargin: number;
	endMargin: number;
	maxPlayers: number;
	gameOngoing: boolean;
	roundOngoing: boolean;
	startedAt: number | null;
	endedAt: number | null;
	lastWinner: string | null;
	players: PublicPlayerData[];
	banned: PlayerInfo[];
};

export type Connection = {
	id: string;
	ws: WebSocket;
	token: string;
	status: "playing" | "spectating" | "idle";
	roomId: string;
	info: PlayerInfo;
};

export const connections = new Map<string, Connection>();
export const rooms = new Map<string, RoomData>();

export function sendClient(ws: WebSocket, message: GeneralServerMessage) {
	const parsed = JSON.stringify(message);
	ws.send(parsed);
}

export function sendRoom(roomId: string, message: GeneralServerMessage) {
	const parsed = JSON.stringify(message);
	const room = rooms.get(roomId);
	if (!room) return;
	for (const player of room.players.values()) {
		player.ws.send(parsed);
	}
	for (const spectator of room.spectators.values()) {
		spectator.send(parsed);
	}
}

const MOVE_TIMEOUT = 5 * 1000;
export function requestMove(player: PlayerData, room: RoomData) {
	if (!player.gameState || !player.playing || !room.roundOngoing) return;

	sendClient(player.ws, {
		type: "request_move",
		payload: {
			gameState: getPublicGameState(player.gameState),
			players: getPublicPlayers(room.players),
		},
	});

	player.lastRequestTimestamp = Date.now();
	player.moveRequested = true;
	if (player.timeout) {
		clearTimeout(player.timeout);
	}
	player.timeout = setTimeout(() => {
		if (!player.gameState || !player.playing || player.gameState.dead)
			return;

		player.gameState.dead = true;
		checkWinner(room);
		// sendRoom(room.id, {
		//     type: "player_died",
		//     payload: {
		//         sessionId: player.sessionId,
		//     },
		// });
	}, MOVE_TIMEOUT);
}

export async function startRound(room: RoomData) {
	if (room.players.size < 2) return;

	for (const player of room.players.values()) {
		if (!player.playing) return;

		player.gameState = createGameState();
		if (player.timeout) {
			clearTimeout(player.timeout);
			player.timeout = null;
		}
		player.moveRequested = false;
	}

	const startsAt = Date.now() + 3000;

	room.startedAt = startsAt;
	room.endedAt = null;
	room.gameOngoing = true;
	room.roundOngoing = false;
	room.lastWinner = null;

	sendRoom(room.id, {
		type: "round_started",
		payload: {
			startsAt,
			roomData: getPublicRoomData(room),
		},
	});

	setTimeout(() => {
		if (!room.gameOngoing) return;

		room.roundOngoing = true;
		room.players.forEach((player) => {
			requestMove(player, room);
		});
	}, 3000);
}

export function checkWinner(room: RoomData) {
	const playersAlive = [...room.players.values()].filter(
		(player) =>
			player.playing && player.gameState && !player.gameState.dead
	);

	if (playersAlive.length < 2) {
		const roundWinner = playersAlive[0];
		roundWinner.wins++;
		room.roundOngoing = false;
		room.lastWinner = roundWinner.sessionId;
		room.endedAt = Date.now();
		sendRoom(room.id, {
			type: "round_over",
			payload: {
				winnerId: roundWinner.sessionId,
				winnerInfo: roundWinner.info,
				roomData: getPublicRoomData(room),
			},
		});
		if (roundWinner.wins >= room.ft) {
			room.gameOngoing = false;
			sendRoom(room.id, {
				type: "game_over",
				payload: {
					winnerId: roundWinner.sessionId,
					winnerInfo: roundWinner.info,
					roomData: getPublicRoomData(room),
				},
			});
			sendRoom(room.id, {
				type: "game_reset",
				payload: {
					roomData: getPublicRoomData(room),
				},
			});
		} else {
			setTimeout(() => {
				startRound(room);
			}, 3000);
		}
	}
}

export function getPublicPlayerData(player: PlayerData): PublicPlayerData {
	return {
		sessionId: player.sessionId,
		playing: player.playing,
		info: player.info,
		wins: player.wins,
		gameState: player.gameState
			? getPublicGameState(player.gameState)
			: null,
	};
}

export function getPublicPlayers(
	players: Map<string, PlayerData>
): PublicPlayerData[] {
	return [...players.values()].map((player) => getPublicPlayerData(player));
}

export function getPublicRoomData(roomData: RoomData): PublicRoomData {
	return {
		id: roomData.id,
		host: roomData.host,
		private: roomData.private,
		ft: roomData.ft,
		pps: roomData.pps,
		initialMultiplier: roomData.initialMultiplier,
		finalMultiplier: roomData.finalMultiplier,
		startMargin: roomData.startMargin,
		endMargin: roomData.endMargin,
		maxPlayers: roomData.maxPlayers,
		gameOngoing: roomData.gameOngoing,
		roundOngoing: roomData.roundOngoing,
		startedAt: roomData.startedAt,
		endedAt: roomData.endedAt,
		lastWinner: roomData.lastWinner,
		players: getPublicPlayers(roomData.players),
		banned: [...roomData.banned].map(([_, player]) => player),
	};
}

export const createRoomKey = customAlphabet(numbers + lowercase, 24);