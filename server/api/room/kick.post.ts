import { z } from 'zod';
import { rooms, startRound } from '~/server/utils/rooms';

const KickSchema = z.object({ roomId: z.string(), targetId: z.string() });

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	};

    const body = await readBody(event);
	const data = KickSchema.parse(body);

    const room = rooms.get(data.roomId);
    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Room not found."
        });
    };

    const player = room.players.get(data.targetId);
    if (!player) {
        throw createError({
            statusCode: 404,
            statusMessage: "Player not found."
        });
    };

    player.ws.close(4001, "Kicked by host");

    sendRoom(data.roomId, {
        type: "player_left",
        payload: {
            sessionId: player.sessionId,
        },
    });

    return { success: true };
});
