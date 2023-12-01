import type { WebSocket } from "ws";
import { getPublicGameState, type GameState, PublicGameState } from "libtris";

export type PlayerInfo = {
    playerId: string;
    creator: string;
    bot: string;
}


type PlayerData = {
    id: string;
    ready: boolean;
    playing: boolean;
    sessionId: string;
    ws: WebSocket;
    gameState: GameState | null;
    info: PlayerInfo;
}

type PublicPlayerData = {
    id: string;
    ready: boolean;
    playing: boolean;
    sessionId: string;
    info: PlayerInfo;
    gameState: PublicGameState | null;
}

export type RoomData = {
    id: string;
    host: PlayerInfo;
    public: boolean;
    ft: number;
    maxPlayers: number;
    ongoing: boolean;
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

export function sendRoom(roomId: string, message: { [key: string]: any }) {
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

export type RoomInfo = {
    id: string;
    host: PlayerInfo;
    public: boolean;
    ft: number;
    maxPlayers: number;
    ongoing: boolean;
    players: PublicPlayerData[];
}

export function getPublicPlayerData(player: PlayerData): PublicPlayerData {
    return {
        id: player.id,
        ready: player.ready,
        sessionId: player.sessionId,
        playing: player.playing,
        info: player.info,
        gameState: getPublicGameState(player.gameState!),
    };
}

export function getPublicPlayers(players: Map<string, PlayerData>): PublicPlayerData[] {
    return [...players.values()].map(player => getPublicPlayerInfo(player));
}

export function getRoomInfo(roomData: RoomData): RoomInfo {
    return {
        id: roomData.id,
        host: roomData.host,
        public: roomData.public,
        ft: roomData.ft,
        maxPlayers: roomData.maxPlayers,
        ongoing: roomData.ongoing,
        players: getPublicPlayers(roomData.players)
    }
}
