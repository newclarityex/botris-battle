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

    const body = await readValidatedBody(event, body => ResetGameSchema.safeParse(body));
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
            roomData: getPublicRoomData(room),
        },
    });

    return { success: true };
});
