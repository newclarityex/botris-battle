import { getPublicRoomData, rooms } from "@/server/utils/rooms";
import { z } from "zod";

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const query = getQuery(event);
    const roomId = query.roomId;

    const parsed = z.string().safeParse(roomId);

    if (!parsed.success) {
        throw createError({
            statusCode: 400,
            message: 'Invalid room ID'
        });
    }

    const room = rooms.get(parsed.data);

    if (!room) {
        throw createError({
            statusCode: 404,
            message: 'Room not found'
        });
    }

    if (room.host.userId !== profile.id) {
        throw createError({
            statusCode: 403,
            message: 'You are not the owner of this room'
        });
    }

    const roomKey = await prisma.roomKey.findFirst({
        where: {
            roomId: room.id,
            singleUse: false,
        }
    });

    return roomKey;
})