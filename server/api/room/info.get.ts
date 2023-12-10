import { getPublicRoomData, rooms } from "@/server/utils/rooms";
import { z } from "zod";

export default defineEventHandler(async (event) => {
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

    return getPublicRoomData(room);
})