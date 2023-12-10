import { checkAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
    const profile = await checkAuth(event);
    if (!profile) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        });
    }

    const token = await prisma.apiToken.create({
        data: {
            profileId: profile.id,
            temp: true,
            expires: new Date(Date.now() + 1000 * 60 * 5),
        }
    });

    return {
        token: token.token,
    };
});