import { prisma } from "../utils/prisma";
import { rooms } from "../utils/rooms";

export default defineNitroPlugin((nitro) => {
    const runtimeConfig = useRuntimeConfig();
    if (runtimeConfig.build) return;

    setInterval(async () => {
        await prisma.botInvite.deleteMany({
            where: {
                expires: {
                    lte: new Date(),
                },
            },
        });

        rooms.forEach((val, key) => {
            if (val.players.size === 0 && val.spectators.size === 0) {
                rooms.delete(key);
            };
        });
    }, 1000);
});