import { type RawData, WebSocket, WebSocketServer } from "ws";
import { zu } from "zod_utilz";
import { v4 as uuid } from "uuid";
import {
    rooms,
    connections,
    sendRoom,
    getPublicRoomData,
    requestMove,
    startRound,
    checkWinner,
} from "~/server/utils/rooms";
import type { Connection, PlayerData } from "~/server/utils/rooms";
import { checkBotToken } from "../utils/auth";
import {
    PlayerMessageSchema,
} from "../utils/messages";
import { calculateMultiplier } from "~/utils/game";

import {
    type Command,
    executeCommands,
    generateGarbage,
    getPublicGameState,
    queueGarbage,
} from "libtris";

interface IDWebSocket extends WebSocket {
    id?: string;
}

async function authenticateWs(
    ws: IDWebSocket,
    roomId: string,
    token: string,
    roomKey: string | null
) {
    if (!ws.id) return null;

    const bot = await checkBotToken(token);

    if (!bot) return null;

    // roomKey can be null when room is public.
    if (roomKey) {
        const key = await prisma.roomKey.findFirst({
            where: {
                key: roomKey,
                roomId,
            },
        });

        if (!key) return null;

        if (key?.singleUse) {
            await prisma.roomKey.delete({
                where: {
                    key: roomKey,
                },
            });
        }
    }

    const connection: Connection = {
        id: ws.id,
        ws,
        token,
        status: "idle",
        roomId,
        info: toPublicBot(bot),
    };

    connections.set(ws.id, connection);

    ws.send(
        JSON.stringify({
            type: "authenticated",
            payload: {
                sessionId: ws.id,
            },
        })
    );

    return connection;
}

const jsonSchema = zu.stringToJSON();
async function handlePlayerMessage(data: RawData, connection: Connection) {
    const message = jsonSchema.safeParse(data.toString());
    if (!message.success) return;

    const parsed = PlayerMessageSchema.safeParse(message.data);
    if (!parsed.success) return;

    const messageData = parsed.data;

    const room = rooms.get(connection.roomId);
    if (!room) return;

    switch (messageData.type) {
        case "ping": {
            sendClient(connection.ws, {
                type: "ping",
                payload: { timestamp: Date.now() },
            });
            return;
        }
        case "action": {
            if (messageData.payload.commands.length > 128) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Action longer than 128 commands",
                    })
                );
                return;
            }

            const player = room.players.get(connection.id);
            if (!player) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Not a player",
                    })
                );
                return
            };
            if (!player.gameState) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Missing GameState",
                    })
                );
                return
            };
            if (player.gameState.dead) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Cannot send commands while dead",
                    })
                );
            };

            if (!room.gameOngoing) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Game not started",
                    })
                );
                return;
            }
            if (!room.roundOngoing) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Inputs not currently allowed",
                    })
                );
                return;
            }
            if (!player.moveRequested) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Not requested to move",
                    })
                );
                return;
            }
            player.moveRequested = false;

            let latency = Date.now() - player.lastRequestTimestamp;

            let serverCommands: Command[] = messageData.payload.commands;
            serverCommands.push('hard_drop');

            const oldGameState = player.gameState!;

            const { initialMultiplier, finalMultiplier, startMargin, endMargin, pps } = room.settings;
            const timePassed = Date.now() - room.startedAt!;
            const multiplier = calculateMultiplier(timePassed, initialMultiplier, finalMultiplier, startMargin, endMargin);

            const { gameState: newGameState, events } = executeCommands(
                player.gameState!,
                serverCommands,
                { multiplier }
            );
            player.gameState = newGameState;

            const requestDelay = 1000 / pps - latency;

            if (!player.gameState.dead) {
                setTimeout(() => {
                    if (player.gameState !== null && player.gameState.dead) return;

                    requestMove(player, room);
                }, requestDelay);
            }
            for (const event of events) {
                if (event.type === "game_over") {
                    // sendRoom(connection.roomId, {
                    //     type: "player_died",
                    //     payload: {
                    //         sessionId: connection.id,
                    //     },
                    // });
                    if (player.timeout) {
                        clearTimeout(player.timeout);
                        player.timeout = null;
                    }
                }
                if (event.type === "clear" && event.payload.attack !== 0) {
                    const amount = event.payload.attack;
                    for (const player of room.players.values()) {
                        if (player.sessionId === connection.id) continue;
                        if (!player.gameState || !player.playing) continue;
                        const garbage = generateGarbage(amount);
                        player.gameState = queueGarbage(
                            player.gameState!,
                            garbage,
                        );
                        sendRoom(room.id, {
                            type: "player_damage_received",
                            payload: {
                                sessionId: player.sessionId,
                                damage: amount,
                                gameState: getPublicGameState(
                                    player.gameState
                                ),
                            },
                        });
                    }
                }
            }
            sendRoom(connection.roomId, {
                type: "player_action",
                payload: {
                    sessionId: connection.id,
                    commands: messageData.payload.commands,
                    gameState: getPublicGameState(newGameState),
                    prevGameState: getPublicGameState(oldGameState),
                    events,
                },
            });

            checkWinner(room);
            break;
        }
    }
}

async function deleteRoom(roomId: string) {
    rooms.delete(roomId);
    await prisma.roomKey.deleteMany({
        where: {
            roomId,
        },
    });
}

export default defineNitroPlugin((event) => {
    const runtimeConfig = useRuntimeConfig();
    if (runtimeConfig.build) return;

    const wss = new WebSocketServer({
        port: 8080,
        path: "/ws"
    });

    wss.on('listening', () => {
        console.log("opened wss on 8080");
    });

    wss.on("connection", async function connection(ws: IDWebSocket, req) {
        ws.on('error', (err) => {
            console.log("Error connecting", err);
        });

        ws.id = uuid();
        const urlArr = req.url!.split("?");

        if (urlArr.length < 2) {
            ws.close(4000, "Invalid URL");
            return;
        }
        const urlParams = new URLSearchParams(urlArr[1]);

        const roomKey = urlParams.get("roomKey");
        let roomId = urlParams.get("roomId");

        if (roomKey) {
            const foundKey = await prisma.roomKey.findFirst({
                where: {
                    key: roomKey,
                },
            });
            if (!foundKey) {
                ws.close(4004, "roomKey expired or doesn't exist");
                return;
            }
            roomId = foundKey.roomId;
        } else if (!roomId) {
            ws.close(4000, "Missing roomId or roomKey");
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            // close with error
            ws.close(4004, "Room not found");
            return;
        }

        const spectating = urlParams.get("spectate") === "true";
        if (!spectating && room.banned.has(ws.id)) {
            ws.close(4001, "Banned by host");
            return;
        }

        sendClient(ws, {
            type: "room_data",
            payload: {
                roomData: getPublicRoomData(room)
            },
        });

        ws.on("close", () => {
            if (!ws.id) return;
            if (room.players.get(ws.id)) {
                sendRoom(room.id, {
                    type: "player_left",
                    payload: {
                        sessionId: ws.id,
                    },
                });
            }
            connections.delete(ws.id);
            room.players.delete(ws.id);
            room.spectators.delete(ws.id);
            if (room.players.size === 0 && room.spectators.size === 0) {
                deleteRoom(room.id);
            } else if (room.players.size === 1) {
                room.players.forEach((player) => {
                    player.gameState = null;
                    if (player.timeout) {
                        clearTimeout(player.timeout);
                        player.timeout = null;
                    }
                });
                room.gameOngoing = false;
                room.roundOngoing = false;
                sendRoom(room.id, {
                    type: "game_reset",
                    payload: {
                        roomData: getPublicRoomData(room),
                    },
                });
            }
        });

        if (spectating) {
            room.spectators.set(ws.id, ws);

            ws.on("close", () => {
                if (!ws.id) return;
                room.spectators.delete(ws.id);
            });

            return;
        }

        const token = urlParams.get("token");

        if (!token) {
            ws.close(4005, "Missing token");
            return;
        }

        if (!roomKey && room.settings.private) {
            ws.close(4005, "Private rooms require a roomKey.");
            return;
        }

        const connection = await authenticateWs(ws, roomId, token, roomKey);

        if (!connection) {
            ws.close(4004, "Failed to authenticate token or roomKey.");
            return;
        }

        if (room.banned.has(connection.id)) {
            ws.close(4001, "Banned by host");
            return;
        }

        if (room.players.size === 2) {
            ws.close(4001, "Too many players");
            return;
        }

        const playerData: PlayerData = {
            sessionId: connection.id,
            ws,
            playing: false,
            wins: 0,
            gameState: null,
            info: connection.info,
            moveRequested: false,
            lastRequestTimestamp: Date.now(),
            timeout: null,
        };

        sendRoom(connection.roomId, {
            type: "player_joined",
            payload: {
                playerData: getPublicPlayerData(playerData),
            },
        });

        room.players.set(connection.id, playerData);

        ws.on("message", (event) => handlePlayerMessage(event, connection));
    });
});
