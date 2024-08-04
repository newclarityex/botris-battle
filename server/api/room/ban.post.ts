import { z } from 'zod';
import { rooms, startRound } from '~/server/utils/rooms';
import type { Block } from '~/utils/game';

const BanSchema = z.object({ roomId: z.string(), targetId: z.string() });

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	};

	const body = await readValidatedBody(event, body => BanSchema.safeParse(body));
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

    const targetProfile = await prisma.profile.findFirst({
        where: {
            id: data.targetId,
        },
    });
    if (!targetProfile) {
        throw createError({
            statusCode: 404,
            statusMessage: "Player not found."
        });
    };

    const playerInfo = {
        userId: profile.id,
        bot: profile.name,
        avatar: profile.avatar as Block[][],
        creator: profile.creator,
    };

    room.banned.set(profile.id, playerInfo);

    for (const [sessionId, player] of room.players.entries()) {
        if (player.info.userId !== data.targetId) continue;

        player.ws.close(4002, "Banned by host");

        room.players.delete(player.sessionId);

        sendRoom(data.roomId, {
            type: "player_left",
            payload: {
                sessionId,
            },
        });
    }
    
    sendRoom(data.roomId, {
        type: "player_banned",
        payload: { playerInfo },
    });

    return { success: true };
});
