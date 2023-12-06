import { MessageEvent, RawData, WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { zu } from "zod_utilz";
import { v4 as uuid } from "uuid";
import { rooms, connections, sendRoom, getPublicRoomData } from "~/server/utils/rooms";
import type { Connection, RoomData } from "~/server/utils/rooms";
import { checkAuthToken } from "../utils/auth";
import {
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

interface IDWebSocket extends WebSocket {
    id?: string;
}

async function authenticateWs(ws: IDWebSocket, token: string, roomId: string) {
    if (!ws.id) return null;

    const profile = await checkAuthToken(token);

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

async function startRound(room: RoomData) {
    for (const player of room.players.values()) {
        if (!player.playing) return;

        player.gameState = createGameState();
    }

    sendRoom(room.id, {
        type: "round_started",
        payload: {
            startsAt: Date.now() + 3000,
            players: getPublicPlayers(room.players),
        },
    });

    room.ongoing = true;
    room.allowInputs = false;
    setTimeout(() => {
        room.allowInputs = true;
        room.players.forEach((player) => {
            if (!player.playing || !player.gameState) return;
            sendClient(player.ws, {
                type: "request_move",
                payload: {
                    gameState: getPublicGameState(player.gameState),
                    players: getPublicPlayers(room.players),
                }
            });
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
            console.log('players', room.players);

            const player = room.players.get(messageData.payload.sessionId);
            console.log('player', player);

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
            if (room.players.size > room.maxPlayers) {
                connection.ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Too many players",
                    })
                );
                return;
            }
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

            for (const player of room.players.values()) {
                player.wins = 0;
                if (player.ready) {
                    player.playing = true;
                }
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
            room.players.forEach((player) => {
                player.ready = false;
            });
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
            room.public = messageData.payload.public;
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
        case "ready": {
            if (room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = true;
            sendRoom(connection.roomId, {
                type: "player_ready",
                payload: {
                    sessionId: connection.id,
                },
            });
            if ([...room.players.values()].every((player) => player.ready) && room.players.size > 1) {
                sendRoom(connection.roomId, {
                    type: "all_ready",
                });
            }
            break;
        }
        case "unready": {
            if (room.ongoing) return;
            const player = room.players.get(connection.id);
            if (!player) return;
            player.ready = false;
            sendRoom(connection.roomId, {
                type: "player_unready",
                payload: {
                    sessionId: connection.id,
                },
            });
            break;
        }
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
            const { gameState: newGameState, events } = executeCommands(
                player.gameState!,
                messageData.payload.commands
            );
            player.gameState = newGameState;
            if (!player.gameState.dead) {
                sendClient(connection.ws, {
                    type: "request_move",
                    payload: {
                        gameState: getPublicGameState(player.gameState),
                        players: getPublicPlayers(room.players),
                    }
                });
            }
            for (const event of events) {
                if (event.type === "game_over") {
                    sendRoom(connection.roomId, {
                        type: "player_died",
                        payload: {
                            userId: connection.id,
                        },
                    });
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
                    sendRoom(connection.roomId, {
                        type: "game_over",
                        payload: {
                            winnerId: roundWinner.sessionId,
                        },
                    });
                    sendRoom(connection.roomId, {
                        type: "game_reset",
                        payload: {
                            players: getPublicPlayers(room.players),
                        }
                    });
                } else {
                    startRound(room);
                }
            }
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
                rooms.delete(roomId);
            }
            if (room.players.size === 1) {
                room.players.forEach((player) => {
                    player.ready = false;
                    player.gameState = null;
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

        const playerData = {
            sessionId: connection.id,
            ws,
            ready: false,
            playing: false,
            wins: 0,
            gameState: null,
            info: connection.info,
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
