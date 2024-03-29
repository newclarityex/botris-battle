import { rooms } from "~/server/utils/rooms";

const TIMEOUT = 10 * 1000;
export default defineNitroPlugin((nitro) => {
    const runtimeConfig = useRuntimeConfig();
    if (runtimeConfig.build) return;

    setInterval(async () => {
        for (const [roomId, room] of rooms) {
            if (Date.now() - room.createdAt > TIMEOUT && room.players.size === 0 && room.spectators.size == 0) {
                rooms.delete(roomId);
            }
        }
    }, 1000);
});