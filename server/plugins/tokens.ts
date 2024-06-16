import { prisma } from "../utils/prisma";

export default defineNitroPlugin((nitro) => {
    const runtimeConfig = useRuntimeConfig();
    if (runtimeConfig.build) return;

    // setInterval(async () => {
    //     await prisma.apiToken.deleteMany({
    //         where: {
    //             expires: {
    //                 lte: new Date(),
    //             },
    //         },
    //     });
    // }, 1000);
});