import { getPublicRoomData, rooms } from "@/server/utils/rooms";

export default defineEventHandler(async (event) => {
    const roomId = event.context.params?.roomId;
    if (!roomId) {
        throw createError({
            statusCode: 400,
            message: 'Invalid room id'
        });
    }

    const room = rooms.get(roomId);

    if (!room) {
        throw createError({
            statusCode: 404,
            message: 'Room not found'
        });
    }

    return getPublicRoomData(room);
})