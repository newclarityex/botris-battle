import { z } from 'zod';
import { rooms, startRound } from '~/server/utils/rooms';

const StartGameSchema = z.object({ roomId: z.string() });

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	};

    const body = await readValidatedBody(event, body => StartGameSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

    const room = rooms.get(data.roomId);

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Room not found."
        });
    };

    if (room.host.id !== profile.id) {
        throw createError({
            statusCode: 403,
            statusMessage: "You are not the host of this room."
        });
    };

    if (room.players.size < 2) {
        throw createError({
            statusCode: 400,
            statusMessage: "You need at 2 players to start the room."
        });
    };

    if (room.players.size > room.maxPlayers) {
        throw createError({
            statusCode: 400,
            statusMessage: "Too many players."
        });
    };

    if (room.gameOngoing) {
        throw createError({
            statusCode: 400,
            statusMessage: "Game already started."
        });
    };

    for (const player of room.players.values()) {
        player.wins = 0;
        player.playing = true;
    };

    sendRoom(room.id, {
        type: "game_started",
    });

    console.log("Starting Game")

    startRound(room);

    return { success: true };
});
