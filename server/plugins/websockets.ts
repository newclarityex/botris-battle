import { MessageEvent, RawData, WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { zu } from 'zod_utilz';
import { v4 as uuid } from 'uuid';
import { rooms, connections, sendRoom } from "~/server/utils/rooms";
import type { Connection } from "~/server/utils/rooms";
import { checkAuthToken } from "../utils/auth";
import { GeneralMessageSchema, PlayerMessageSchema } from "../utils/messages";
import { createGameState, executeCommands, generateGarbage, getPublicGameState, queueGarbage } from "libtris";

interface IDWebSocket extends WebSocket {
    id?: string;
}

const AuthSchema = z.object({
    type: z.literal('auth'),
    payload: z.object({
        token: z.string(),
    }),
});
function authenticateWs(ws: IDWebSocket, roomId: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
        ws.on('message', async (data: any) => {
            if (!ws.id) return;

            const message = JSON.parse(data);
            const parsed = AuthSchema.safeParse(message);
            if (!parsed.success) {
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: 'Invalid message',
                }));
                return;
            }

            const { token } = parsed.data.payload;
            const profile = await checkAuthToken(token);

            if (!profile) {
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: 'Invalid token',
                }));
                return;
            }

            const connection: Connection = {
                id: ws.id,
                ws,
                token,
                status: 'idle',
                roomId,
                info: {
                    playerId: profile.id,
                    creator: profile.creator,
                    bot: profile.name,
                }
            };

            connections.set(ws.id, connection);

            ws.send(JSON.stringify({
                type: 'authenticated',
                payload: {
                    id: ws.id,
                },
            }));

            resolve(connection);
        });
    });
}

const jsonSchema = zu.stringToJSON()
async function handleGeneralMessage(event: RawData, connection: Connection) {
    const message = jsonSchema.safeParse(event);
    if (!message.success) return;

    const parsed = GeneralMessageSchema.safeParse(message.data);
    if (!parsed.success) return;

    const messageData = parsed.data;

    const room = rooms.get(connection.roomId);
    if (!room) return;

    switch (messageData.type) {
        case 'kick': {
            const player = room.players.get(messageData.payload.playerId);
            if (!player) return;
            player.ws.close(
                4000,
                'Kicked by host'
            );
            room.players.delete(messageData.payload.playerId);
            sendRoom(connection.roomId, {
                type: 'player_left',
                payload: {
                    id: messageData.payload.playerId,
                },
            });
            break;
        }
        case 'ban': {
            room.banned.add(messageData.payload.playerId);
            const player = room.players.get(messageData.payload.playerId);
            // TODO: Send error message
            if (!player) return;
            player.ws.close(
                4001,
                'Banned by host'
            );
            room.players.delete(messageData.payload.playerId);
            sendRoom(connection.roomId, {
                type: 'player_left',
                payload: {
                    id: messageData.payload.playerId,
                },
            });
            break;
        }
        case 'unban': {
            room.banned.delete(messageData.payload.playerId);
            break;
        }
        case 'start_game': {
            const playersReady = [...room.players.values()].filter((player) => player.ready).length;
            if (playersReady < 2) {
                sendRoom(connection.roomId, {
                    type: 'error',
                    payload: 'Not enough players ready',
                });
                return;
            };
            if (room.ongoing) {
                sendRoom(connection.roomId, {
                    type: 'error',
                    payload: 'Game already started',
                });
                return;
            };

            room.ongoing = true;
            for (const player of room.players.values()) {
                if (!player.ready) return;

                player.playing = true;
                player.gameState = createGameState();
            }

            sendRoom(connection.roomId, {
                type: 'game_started',
                payload: {
                    players: [...room.players.values()].map((player) => ({
                        id: player.id,
                        info: player.info,
                        gameState: getPublicGameState(player.gameState!),
                    })),
                }
            });

            break;
        }
        case 'reset_game': {
            if (!room.ongoing) return;
            room.ongoing = false;
            room.players.forEach((player) => {
                player.ready = false;
            });
            sendRoom(connection.roomId, {
                type: 'game_reset',
            });
            break;
        }
    }
}

async function handlePlayerMessage(event: RawData, connection: Connection) {
    const message = jsonSchema.safeParse(event);
    if (!message.success) return;

    const parsed = PlayerMessageSchema.safeParse(message.data);
    if (!parsed.success) return;

    const messageData = parsed.data;

    const room = rooms.get(connection.roomId);
    if (!room) return;

    switch (messageData.type) {
        case 'ready': {
            if (!room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = true;
            sendRoom(connection.roomId, {
                type: 'player_ready',
                payload: {
                    id: connection.id,
                },
            });
            if ([...room.players.values()].every((player) => player.ready)) {
                sendRoom(connection.roomId, {
                    type: 'all_ready',
                });
            }
            break;
        }
        case 'unready': {
            if (!room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = false;
            sendRoom(connection.roomId, {
                type: 'player_unready',
                payload: {
                    id: connection.id,
                },
            });
            break;
        }
        case 'commands': {
            const player = room.players.get(connection.id);
            if (!player) return;
            const { gameState: newGameState, events } = executeCommands(player.gameState!, messageData.payload.commands);
            player.gameState = newGameState;
            for (const event of events) {
                if (event.type === 'game_over') {
                    sendRoom(connection.roomId, {
                        type: 'game_over',
                        payload: {
                            id: connection.id,
                        },
                    });
                }
                if (event.type === 'attack') {
                    const amount = event.payload.lines;
                    for (const player of room.players.values()) {
                        if (player.id === connection.id) continue;
                        const garbage = generateGarbage(amount);
                        player.gameState = queueGarbage(player.gameState!, garbage);
                    }
                }
            }
            sendRoom(connection.roomId, {
                type: 'player_commands',
                payload: {
                    id: connection.id,
                    commands: messageData.payload.commands,
                    newGameState: getPublicGameState(newGameState),
                    events,
                },
            });
            break;
        }
    }
};

export default defineNitroPlugin((nitroApp) => {
    const wss = new WebSocketServer({
        host: '0.0.0.0',
        port: 8080,
    });

    wss.on('connection', async function connection(ws: IDWebSocket, req) {
        ws.id = uuid();

        const url = new URL(req.url!);

        const roomId = url.searchParams.get('roomId');
        if (!roomId) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: 'Invalid roomId',
            }));
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: 'Room not found',
            }));
            return;
        }

        const spectating = url.searchParams.get('spectating') === 'true';
        if (!spectating && room.banned.has(ws.id)) {
            ws.close(
                4001,
                'Banned by host'
            );
            return;
        }

        ws.send(JSON.stringify({
            type: 'room_info',
            payload: getRoomInfo(room),
        }));

        ws.on('close', () => {
            if (!ws.id) return;
            connections.delete(ws.id);
            room.players.delete(ws.id);
            room.spectators.delete(ws.id);
            if (room.players.size === 0 && room.spectators.size === 0) {
                rooms.delete(roomId);
            }
        });

        if (spectating) {
            room.spectators.set(ws.id, ws);

            ws.on('close', () => {
                if (!ws.id) return;
                room.spectators.delete(ws.id);
            });
        }

        const connection = await authenticateWs(ws, roomId);

        ws.on('message', (event) => handleGeneralMessage(event, connection));

        if (spectating) return;

        if (room.banned.has(connection.id)) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: 'You are banned from this room',
            }));
            return;
        }

        if (room.maxPlayers >= room.players.size) {
            ws.send(JSON.stringify({
                type: 'error',
                payload: 'Room is full',
            }));
            return;
        }

        room.players.set(connection.id, {
            id: connection.id,
            sessionId: uuid(),
            ws,
            ready: false,
            playing: false,
            gameState: null,
            info: connection.info,
        });

        ws.on('message', (event) => handlePlayerMessage(event, connection));
    });
});