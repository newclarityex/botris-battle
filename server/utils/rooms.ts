import { getPublicGameState, type GameState, PublicGameState, createGameState } from "libtris";
import { GeneralServerMessage } from "./messages";
import { Block } from "~/utils/game";
import { customAlphabet } from "nanoid";
import { numbers, lowercase } from "nanoid-dictionary";
import type { Peer } from 'crossws';

export type PlayerInfo = {
	userId: string;
	creator: string;
	bot: string;
	avatar: Block[][];
};

export type PlayerData = {
	sessionId: string;
	playing: boolean;
	peer: Peer;
	wins: number;
	gameState: GameState | null;
	info: PlayerInfo;
	moveRequested: boolean;
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
	currentPlayer: string;
	baseTime: number;
	bonusTime: number;
	marginTime: number;
	moveTimeout: number;
	maxPlayers: number;
	gameOngoing: boolean;
	roundOngoing: boolean;
	startedAt: number | null;
	endedAt: number | null;
	lastWinner: string | null;
	banned: Map<string, PlayerInfo>;
	players: Map<string, PlayerData>;
	spectators: Map<string, Peer>;
};

export type PublicRoomData = {
	id: string;
	host: PlayerInfo;
	private: boolean;
	ft: number;
	currentPlayer: string;
	baseTime: number;
	bonusTime: number;
	marginTime: number;
	moveTimeout: number;
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
	peer: Peer;
	token: string;
	status: "playing" | "spectating" | "idle";
	roomId: string;
	info: PlayerInfo;
};

export const connections = new Map<string, Connection>();
export const rooms = new Map<string, RoomData>();

export function sendClient(peer: Peer, message: GeneralServerMessage) {
	const parsed = JSON.stringify(message);
	peer.send(parsed);
}

export function sendRoom(roomId: string, message: GeneralServerMessage) {
	const parsed = JSON.stringify(message);
	const room = rooms.get(roomId);
	if (!room) return;
	for (const player of room.players.values()) {
		player.peer.send(parsed);
	}
	for (const spectator of room.spectators.values()) {
		spectator.send(parsed);
	}
}

const MOVE_TIMEOUT = 5 * 1000;
export function requestMove(player: PlayerData, room: RoomData) {
	if (!player.gameState || !player.playing) return;

	sendClient(player.peer, {
		type: "request_move",
		payload: {
			gameState: getPublicGameState(player.gameState),
			players: getPublicPlayers(room.players),
		},
	});

	player.moveRequested = true;
	if (player.timeout) {
		clearTimeout(player.timeout);
	}
	player.timeout = setTimeout(() => {
		if (!player.gameState || !player.playing || player.gameState.dead)
			return;

		player.gameState.dead = true;
		// sendRoom(room.id, {
		//     type: "player_died",
		//     payload: {
		//         sessionId: player.sessionId,
		//     },
		// });
	}, MOVE_TIMEOUT);
}

export async function startRound(room: RoomData) {
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
		currentPlayer: roomData.currentPlayer,
		baseTime: roomData.baseTime,
		bonusTime: roomData.bonusTime,
		marginTime: roomData.marginTime,
		moveTimeout: roomData.moveTimeout,
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