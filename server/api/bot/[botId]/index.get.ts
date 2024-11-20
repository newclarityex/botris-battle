import { prisma } from '@/server/utils/prisma';
import { toPublicBot } from '~/server/utils/bot';

export default defineEventHandler(async (event) => {
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
            statusMessage: "Bot not found.",
        });
    };

    return toPublicBot(bot);
});