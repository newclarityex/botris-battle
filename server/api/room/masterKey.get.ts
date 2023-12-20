import { getPublicRoomData, rooms } from "@/server/utils/rooms";
import { z } from "zod";
import { getServerSession, getServerToken } from "#auth"
import { authOptions } from "../auth/[...]";

export default defineEventHandler(async (event) => {
    const session = await getServerSession(event, authOptions)
    if (!session?.user?.id) {
        throw createError({
            statusCode: 401,
            message: 'You must be sign in to view your profile.'
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

    if (room.host.userId !== session.user.id) {
        throw createError({
            statusCode: 403,
            message: 'You are not the owner of this room'
        });
    }

    const token = await prisma.roomToken.findFirst({
        where: {
            roomId: room.id,
            singleUse: false,
        }
    });

    return token;
})