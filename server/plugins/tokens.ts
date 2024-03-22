import { prisma } from "../utils/prisma";

export default defineNitroPlugin((nitro) => {
    // setInterval(async () => {
    //     await prisma.apiToken.deleteMany({
    //         where: {
    //             expires: {
    //                 lte: new Date(),
    //             },
    //         },
    //     }).catch(e => {});
    // }, 1000);
});