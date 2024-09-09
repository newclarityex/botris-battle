import { prisma } from '@/server/utils/prisma';

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const botId = getRouterParam(event, 'botId');
	if (botId === undefined) {
		throw createError({
			statusCode: 400,
			statusMessage: "Missing botId."
		});
	}

    const bot = await prisma.bot.findFirst({
        where: {
            id: botId,
        },
        include: {
            developers: true,
        }
    });
    if (bot === null) {
        throw createError({
            statusCode: 404,
            statusMessage: "Bot doesn't exist.",
        })
    };

    if (!bot.developers.find(developer => developer.id === profile.id)) {
        throw createError({
            statusCode: 404,
            statusMessage: "You aren't a developer for this bot.",
        })
    };

    const expires = new Date();
    expires.setDate(expires.getDate() + 7)

    const invite = await prisma.botInvite.create({
        data: {
            botId: botId,
            expires,
            key: crypto.randomUUID(),
        },
    });

    return invite.key;
});