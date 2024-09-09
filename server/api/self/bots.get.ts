import { AvatarSchema } from "@/utils/avatar";

export default defineEventHandler(async (event) => {
    const profile = await checkAuth(event.context.user);
    if (!profile) {
        throw createError({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    
    const botProfile = await prisma.profile.findFirstOrThrow({ 
        where: { id: profile.id }, 
        include: { 
            Bots: { 
                include: { developers: true}
            } 
        } 
    });
    const bots = botProfile.Bots.map(bot => {
        return toPublicBot(bot);
    });
    bots.sort((a, b) => a.name.localeCompare(b.name) );

    return bots;
})