import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const DeleteTokenSchema = z.object({
    token: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => DeleteTokenSchema.safeParse(body));
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
	if (bot?.developers.find(dev => dev.id === profile.id) == null) {
        throw createError({
			statusCode: 403,
            statusMessage: "You aren't a developer for this bot.",
        });
    };

	const token = await prisma.botToken.delete({
        where: {
			botId: botId,
            token: data.token,
        }
    });

	if (token === null) {
		throw createError({
			statusCode: 404,
			statusMessage: "Token does not exist."
		});
	}

    return {
        success: true,
    };
});