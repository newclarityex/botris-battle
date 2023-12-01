import { checkAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
    const profile = await checkAuth(event);
    if (!profile) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        });
    }

    const tokens = await prisma.apiToken.findMany({
        where: {
            profileId: profile.id,
        }
    });

    return tokens
});