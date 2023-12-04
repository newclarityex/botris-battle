import type { WebSocket } from "ws";
import { getPublicGameState, type GameState, PublicGameState } from "libtris";
import { GeneralServerMessage } from "./messages";

export type PlayerInfo = {
    userId: string;
    creator: string;
    bot: string;
}


type PlayerData = {
    sessionId: string;
    ready: boolean;
    playing: boolean;
    ws: WebSocket;
    wins: number;
    gameState: GameState | null;
    info: PlayerInfo;
}

export type PublicPlayerData = {
    sessionId: string;
    ready: boolean;
    playing: boolean;
    info: PlayerInfo;
    wins: number;
    gameState: PublicGameState | null;
}

export type RoomData = {
    id: string;
    host: PlayerInfo;
    public: boolean;
    ft: number;
    ppsCap: number;
    maxPlayers: number;
    ongoing: boolean;
    allowInputs: boolean;
    banned: Set<string>;
    players: Map<string, PlayerData>;
    spectators: Map<string, WebSocket>;
}

export type Connection = {
    id: string;
    ws: WebSocket;
    token: string;
    status: 'playing' | 'spectating' | 'idle';
    roomId: string;
    info: PlayerInfo;
}

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

export type PublicRoomData = {
    id: string;
    host: PlayerInfo;
    public: boolean;
    ft: number;
    ppsCap: number;
    maxPlayers: number;
    ongoing: boolean;
    allowInputs: boolean;
    players: PublicPlayerData[];
    banned: string[];
}

export function getPublicPlayerData(player: PlayerData): PublicPlayerData {
    return {
        sessionId: player.sessionId,
        ready: player.ready,
        playing: player.playing,
        info: player.info,
        wins: player.wins,
        gameState: player.gameState ? getPublicGameState(player.gameState) : null,
    };
}

export function getPublicPlayers(players: Map<string, PlayerData>): PublicPlayerData[] {
    return [...players.values()].map(player => getPublicPlayerData(player));
}

export function getPublicRoomData(roomData: RoomData): PublicRoomData {
    return {
        id: roomData.id,
        host: roomData.host,
        public: roomData.public,
        ft: roomData.ft,
        ppsCap: roomData.ppsCap,
        maxPlayers: roomData.maxPlayers,
        ongoing: roomData.ongoing,
        allowInputs: roomData.allowInputs,
        players: getPublicPlayers(roomData.players),
        banned: [...roomData.banned],
    }
}
