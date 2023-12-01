
import { getRoomInfo, rooms } from "@/server/utils/rooms";

export default defineEventHandler(async (event) => {
    const publicRooms = [...rooms.values()].filter(room => room.public);

    return publicRooms.map(room => getRoomInfo(room));
})