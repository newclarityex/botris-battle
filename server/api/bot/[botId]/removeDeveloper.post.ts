import { prisma } from '@/server/utils/prisma';
import { z } from 'zod';

const RemoveDeveloperSchema = z.object({
    developer: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => RemoveDeveloperSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

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
    if (bot.developers.length === 1) {
        throw createError({
            statusCode: 400,
            statusMessage: "You cannot remove the last developer.",
        })
    };

    await prisma.bot.update({
        where: {
            id: bot.id,
        },
        data: {
            developers: {
                disconnect: {
                    id: data.developer,
                },
            },
        },
    });

    return {
        success: true,
    };
});