import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const CreateTokenSchema = z.object({
    name: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => CreateTokenSchema.safeParse(body));
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

    const token = await prisma.botToken.create({
        data: {
            botId: botId,
            name: data.name,
        }
    });

    return {
        token: token.token,
    };
});