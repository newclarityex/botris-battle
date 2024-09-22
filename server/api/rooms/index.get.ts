
import { getPublicRoomData, rooms } from "@/server/utils/rooms";

export default defineEventHandler(async (event) => {
    const publicRooms = [...rooms.values()].filter(room => !room.settings.private);

    return publicRooms.map(room => getPublicRoomData(room));
})