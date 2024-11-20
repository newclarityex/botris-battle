import { checkAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const botId = getRouterParam(event, 'botId');

    const bot = await prisma.bot.findFirst({
        where: {
            id: botId,
        },
        include: {
            developers: true,
            botTokens: true,
        }
    });

    if (bot?.developers.find(dev => dev.id === profile.id) == null) {
        throw createError({
			statusCode: 403,
            statusMessage: "You aren't a developer for this bot."
        });
    };

    return bot.botTokens;
});