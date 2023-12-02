import { MessageEvent, RawData, WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { zu } from "zod_utilz";
import { v4 as uuid } from "uuid";
import { rooms, connections, sendRoom } from "~/server/utils/rooms";
import type { Connection } from "~/server/utils/rooms";
import { checkAuthToken } from "../utils/auth";
import {
    AuthSchema,
    GeneralMessageSchema,
    PlayerMessageSchema,
} from "../utils/messages";
import {
    createGameState,
    executeCommands,
    generateGarbage,
    getPublicGameState,
    queueGarbage,
} from "libtris";
import { Server } from "http";

interface IDWebSocket extends WebSocket {
    id?: string;
}



async function authenticateWs(ws: IDWebSocket, token: string, roomId: string) {
    if (!ws.id) return null;

    const profile = await checkAuthToken(token);
    console.log("Profile: ", profile);

    if (!profile) return null;

    const connection: Connection = {
        id: ws.id,
        ws,
        token,
        status: "idle",
        roomId,
        info: {
            userId: profile.id,
            creator: profile.creator,
            bot: profile.name,
        },
    };

    connections.set(ws.id, connection);

    ws.send(
        JSON.stringify({
            type: "authenticated",
            payload: {
                id: ws.id,
            },
        })
    );

    return connection;
}

const jsonSchema = zu.stringToJSON();
async function handleGeneralMessage(data: RawData, connection: Connection) {
    const message = jsonSchema.safeParse(data.toString());
    if (!message.success) return;

    const parsed = GeneralMessageSchema.safeParse(message.data);
    if (!parsed.success) return;

    const messageData = parsed.data;

    const room = rooms.get(connection.roomId);
    if (!room) return;

    if (connection.info.userId !== room.host.userId) return;

    switch (messageData.type) {
        case "kick": {
            const player = room.players.get(messageData.payload.sessionId);
            if (!player) return;
            player.ws.close(4001, "Kicked by host");
            for (const [sessionId, player] of room.players.entries()) {
                if (player.id !== messageData.payload.sessionId) continue;

                room.players.delete(sessionId);
                sendRoom(connection.roomId, {
                    type: "player_left",
                    payload: {
                        sessionId,
                    },
                });
            }
            break;
        }
        case "ban": {
            room.banned.add(messageData.payload.userId);
            for (const [sessionId, player] of room.players.entries()) {
                if (player.id !== messageData.payload.userId) continue;

                player.ws.close(4002, "Banned by host");
                room.players.delete(sessionId);
                sendRoom(connection.roomId, {
                    type: "player_left",
                    payload: {
                        sessionId,
                    },
                });
            }
            break;
        }
        case "unban": {
            room.banned.delete(messageData.payload.userId);
            break;
        }
        case "start_game": {
            const playersReady = [...room.players.values()].filter(
                (player) => player.ready
            ).length;
            if (playersReady < 2) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Not enough players",
                    })
                );
                return;
            }
            if (room.ongoing) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Game already started",
                    })
                );
                return;
            }

            room.ongoing = true;
            for (const player of room.players.values()) {
                if (!player.ready) return;

                player.playing = true;
                player.gameState = createGameState();
            }

            sendRoom(connection.roomId, {
                type: "game_started",
                payload: {
                    startsAt: Date.now() + 3000,
                    players: getPublicPlayers(room.players),
                },
            });

            break;
        }
        case "reset_game": {
            if (!room.ongoing) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Game not started",
                    })
                );
                return;
            };
            room.ongoing = false;
            room.players.forEach((player) => {
                player.ready = false;
            });
            sendRoom(connection.roomId, {
                type: "game_reset",
            });
            break;
        }
        case 'transfer_host': {
            const player = room.players.get(messageData.payload.userId);
            if (!player) return;
            room.host = player.info;
            sendRoom(connection.roomId, {
                type: 'host_changed',
                payload: {
                    hostInfo: player.info,
                }
            })
            break;
        }
        case 'room_settings': {
            room.maxPlayers = messageData.payload.maxPlayers;
            room.ft = messageData.payload.ft;
            room.public = messageData.payload.public;
            break;
        }
    }
}

async function handlePlayerMessage(data: RawData, connection: Connection) {
    const message = jsonSchema.safeParse(data.toString());
    if (!message.success) return;

    const parsed = PlayerMessageSchema.safeParse(message.data);
    if (!parsed.success) return;

    const messageData = parsed.data;

    const room = rooms.get(connection.roomId);
    if (!room) return;

    switch (messageData.type) {
        case "ready": {
            if (!room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = true;
            sendRoom(connection.roomId, {
                type: "player_ready",
                payload: {
                    userId: connection.id,
                },
            });
            if ([...room.players.values()].every((player) => player.ready)) {
                sendRoom(connection.roomId, {
                    type: "all_ready",
                });
            }
            break;
        }
        case "unready": {
            if (!room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = false;
            sendRoom(connection.roomId, {
                type: "player_unready",
                payload: {
                    userId: connection.id,
                },
            });
            break;
        }
        case "commands": {
            const player = room.players.get(connection.id);
            if (!player) return;
            const { gameState: newGameState, events } = executeCommands(
                player.gameState!,
                messageData.payload.commands
            );
            player.gameState = newGameState;
            for (const event of events) {
                if (event.type === "game_over") {
                    sendRoom(connection.roomId, {
                        type: "player_died",
                        payload: {
                            userId: connection.id,
                        },
                    });
                }
                if (event.type === "attack") {
                    const amount = event.payload.lines;
                    for (const player of room.players.values()) {
                        if (player.id === connection.id) continue;
                        const garbage = generateGarbage(amount);
                        player.gameState = queueGarbage(
                            player.gameState!,
                            garbage
                        );
                    }
                }
            }
            sendRoom(connection.roomId, {
                type: "player_commands",
                payload: {
                    sessionId: connection.id,
                    commands: messageData.payload.commands,
                    newGameState: getPublicGameState(newGameState),
                    events,
                },
            });
            break;
        }
    }
}

export default defineNitroPlugin((event) => {
    const wss = new WebSocketServer({
        port: 8080,
    });

    wss.on("connection", async function connection(ws: IDWebSocket, req) {
        ws.id = uuid();
        console.log("WS connection from ", ws.id);
        const urlArr = req.url!.split("?");

        if (urlArr.length < 2) {
            ws.close(4000, "Invalid URL");
            return;
        }
        const urlParams = new URLSearchParams(urlArr[1]);

        const roomId = urlParams.get("roomId");
        if (!roomId) {
            ws.send(
                JSON.stringify({
                    type: "error",
                    payload: "Invalid roomId",
                })
            );
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            ws.send(
                JSON.stringify({
                    type: "error",
                    payload: "Room not found",
                })
            );
            return;
        }

        const spectating = urlParams.get("spectate") === "true";
        if (!spectating && room.banned.has(ws.id)) {
            ws.close(4001, "Banned by host");
            return;
        }

        ws.send(
            JSON.stringify({
                type: "room_info",
                payload: getRoomInfo(room),
            })
        );

        ws.on("close", () => {
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

            ws.on("close", () => {
                if (!ws.id) return;
                room.spectators.delete(ws.id);
            });
        }

        const token = urlParams.get("token");


        if (!token && !spectating) {
            ws.close(4005, "Missing token");
            return;
        }
        if (!token) return;

        const connection = await authenticateWs(ws, token, roomId);

        if (!connection) {
            ws.close(4004, "Invalid token");
            return;
        };

        ws.on("message", (data) => handleGeneralMessage(data, connection));

        if (spectating) return;

        if (room.banned.has(connection.id)) {
            ws.send(
                JSON.stringify({
                    type: "error",
                    payload: "You are banned from this room",
                })
            );
            return;
        }

        if (room.players.size >= room.maxPlayers) {
            ws.send(
                JSON.stringify({
                    type: "error",
                    payload: "Room is full",
                })
            );
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

        ws.on("message", (event) => handlePlayerMessage(event, connection));
    });
});
