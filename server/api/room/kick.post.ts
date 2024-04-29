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

    const body = await readValidatedBody(event, body => KickSchema.safeParse(body));
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

    const player = room.players.get(data.targetId);
    if (!player) {
        throw createError({
            statusCode: 404,
            statusMessage: "Player not found."
        });
    };

    room.players.delete(data.targetId);

    player.ws.close(4001, "Kicked by host");

    sendRoom(data.roomId, {
        type: "player_left",
        payload: {
            sessionId: player.sessionId,
        },
    });

    return { success: true };
});
