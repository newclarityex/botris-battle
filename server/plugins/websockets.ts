import { RawData, WebSocket, WebSocketServer } from "ws";
import { zu } from "zod_utilz";
import { v4 as uuid } from "uuid";
import { rooms, connections, sendRoom, getPublicRoomData } from "~/server/utils/rooms";
import type { Connection, PlayerData, RoomData } from "~/server/utils/rooms";
import { checkAuthToken } from "../utils/auth";
import {
    GeneralMessageSchema,
    GeneralServerMessage,
    PlayerMessageSchema,
} from "../utils/messages";
import {
    createGameState,
    executeCommands,
    generateGarbage,
    getPublicGameState,
    queueGarbage,
} from "libtris";
import { Block } from "~/utils/game";

interface IDWebSocket extends WebSocket {
    id?: string;
}

const MOVE_TIMEOUT = 5000;

async function authenticateWs(ws: IDWebSocket, roomId: string, userToken: string, roomKey: string) {
    if (!ws.id) return null;

    const profile = await checkAuthToken(userToken);

    if (!profile) return null;

    const key = await prisma.roomToken.findFirst({
        where: {
            token: roomKey,
            roomId,
        },
    });

    if (!key) return null;

    const connection: Connection = {
        id: ws.id,
        ws,
        token: userToken,
        status: "idle",
        roomId,
        info: {
            userId: profile.id,
            creator: profile.creator,
            bot: profile.name,
            avatar: profile.avatar as Block[][],
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

function requestMove(player: PlayerData, room: RoomData) {
    if (!player.gameState || !player.playing) return;

    sendClient(player.ws, {
        type: "request_move",
        payload: {
            gameState: getPublicGameState(player.gameState),
            players: getPublicPlayers(room.players),
        }
    });

    player.moveRequested = true;
    if (player.timeout) {
        clearTimeout(player.timeout);
    }
    player.timeout = setTimeout(() => {
        if (!player.gameState || !player.playing || player.gameState.dead) return;

        player.gameState.dead = true
        sendRoom(room.id, {
            type: "player_died",
            payload: {
                sessionId: player.sessionId,
            },
        });
    }, MOVE_TIMEOUT);
}

async function startRound(room: RoomData) {
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
    room.ongoing = true;
    room.allowInputs = false;

    sendRoom(room.id, {
        type: "round_started",
        payload: {
            startsAt,
            players: getPublicPlayers(room.players),
            roomData: getPublicRoomData(room),
        },
    });

    setTimeout(() => {
        room.allowInputs = true;
        room.players.forEach((player) => {
            requestMove(player, room);
        });
    }, 3000);
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
            sendRoom(connection.roomId, {
                type: "player_left",
                payload: {
                    sessionId: player.sessionId,
                },
            });
            break;
        }
        case "ban": {
            room.banned.add(messageData.payload.userId);
            for (const [sessionId, player] of room.players.entries()) {
                if (player.info.userId !== messageData.payload.userId) continue;

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
            if (room.players.size < 2) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Not enough players",
                    })
                );
                return;
            }

            if (room.players.size > room.maxPlayers) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Too many players",
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

            for (const player of room.players.values()) {
                player.wins = 0;
                player.playing = true;
            }

            sendRoom(connection.roomId, {
                type: "game_started",
            });

            startRound(room);

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
            room.allowInputs = false;
            sendRoom(connection.roomId, {
                type: "game_reset",
                payload: {
                    players: getPublicPlayers(room.players),
                }
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
            room.private = messageData.payload.private;
            sendRoom(connection.roomId, {
                type: 'settings_changed',
                payload: {
                    publicRoomData: getPublicRoomData(room),
                }
            });
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
        case "commands": {
            const player = room.players.get(connection.id);
            if (!player) return;
            if (!room.ongoing) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Game not started",
                    })
                );
            }
            if (!room.allowInputs) {
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
            const { gameState: newGameState, events } = executeCommands(
                player.gameState!,
                messageData.payload.commands
            );
            player.gameState = newGameState;
            if (!player.gameState.dead) {
                setTimeout(() => {
                    requestMove(player, room);
                }, 1000 * 1 / room.ppsCap);
            }
            for (const event of events) {
                if (event.type === "game_over") {
                    sendRoom(connection.roomId, {
                        type: "player_died",
                        payload: {
                            sessionId: connection.id,
                        },
                    });
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
                            garbage
                        );
                        sendRoom(room.id, {
                            type: "player_damage_received",
                            payload: {
                                sessionId: player.sessionId,
                                damage: amount,
                                newGameState: getPublicGameState(player.gameState),
                            },
                        });
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

            const playersAlive = [...room.players.values()].filter(
                (player) => player.playing && player.gameState && !player.gameState.dead
            );

            if (playersAlive.length < 2) {
                const roundWinner = playersAlive[0];
                roundWinner.wins++;
                room.allowInputs = false;
                sendRoom(connection.roomId, {
                    type: "round_over",
                    payload: {
                        winnerId: roundWinner.sessionId,
                    },
                });
                if (roundWinner.wins >= room.ft) {
                    room.ongoing = false;
                    room.endedAt = Date.now();
                    sendRoom(connection.roomId, {
                        type: "game_over",
                        payload: {
                            winnerId: roundWinner.sessionId,
                            roomData: getPublicRoomData(room),
                        },
                    });
                    sendRoom(connection.roomId, {
                        type: "game_reset",
                        payload: {
                            players: getPublicPlayers(room.players),
                        }
                    });
                } else {
                    setTimeout(() => {
                        startRound(room);
                    }, 3000);
                }
            }
            break;
        }
    }
}

async function deleteRoom(roomId: string) {
    rooms.delete(roomId);
    await prisma.roomToken.deleteMany({
        where: {
            roomId,
        }
    });
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
            ws.close(4000, "Invalid URL");
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
            type: "room_info",
            payload: { publicRoomData: getPublicRoomData(room) },
        });

        ws.on("close", () => {
            if (!ws.id) return;
            if (room.players.get(ws.id)) {
                sendRoom(roomId, {
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
                deleteRoom(roomId)
            } else if (room.players.size === 1) {
                room.players.forEach((player) => {
                    player.gameState = null;
                    if (player.timeout) {
                        clearTimeout(player.timeout);
                        player.timeout = null;
                    }
                });
                room.ongoing = false;
                sendRoom(roomId, {
                    type: "game_reset",
                    payload: {
                        players: getPublicPlayers(room.players),
                    }
                });
            }
        });

        if (spectating) {
            room.spectators.set(ws.id, ws);

            ws.on("close", () => {
                if (!ws.id) return;
                room.spectators.delete(ws.id);
            });
        }

        const userToken = urlParams.get("userToken");
        const roomKey = urlParams.get("roomKey");

        if (!userToken || !roomKey) {
            if (!spectating) {
                ws.close(4005, "Missing userToken");
            }
            return;
        }

        const connection = await authenticateWs(ws, roomId, userToken, roomKey);

        if (!connection) {
            ws.close(4004, "Failed to authenticate userToken or roomKey.");
            return;
        };

        ws.on("message", (data) => handleGeneralMessage(data, connection));

        if (spectating) return;

        if (room.banned.has(connection.id)) {
            ws.close(4001, "Banned by host");
            return;
        }

        if (room.players.size >= room.maxPlayers) {
            ws.close(4001, "Too many players");
            return;
        }

        const playerData = {
            sessionId: connection.id,
            ws,
            ready: false,
            playing: false,
            wins: 0,
            gameState: null,
            info: connection.info,
            moveRequested: false,
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
