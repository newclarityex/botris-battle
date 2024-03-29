import { z } from 'zod';
import { rooms, startRound } from '~/server/utils/rooms';

const ResetGameSchema = z.object({ roomId: z.string() });

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	};

    const body = await readBody(event);
	const data = ResetGameSchema.parse(body);

    const room = rooms.get(data.roomId);

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Room not found."
        });
    };

    if (!room.gameOngoing) {
        throw createError({
            statusCode: 400,
            statusMessage: "Game not started.",
        });
    }

    room.gameOngoing = false;
    room.roundOngoing = false;

    sendRoom(data.roomId, {
        type: "game_reset",
        payload: {
            players: getPublicPlayers(room.players),
        },
    });

    return { success: true };
});
