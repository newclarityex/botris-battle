import { checkAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const tokens = await prisma.apiToken.findMany({
        where: {
            profileId: profile.id,
            temp: false
        }
    });

    return tokens
});