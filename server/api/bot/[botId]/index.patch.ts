import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';
import { AvatarSchema } from '~/utils/avatar';

const CreateBotSchema = z.object({
    avatar: AvatarSchema.optional(),
    name: z.string().min(1).max(32).optional(),
    team: z.string().min(1).max(32).optional(),
    language: z.string().max(32).optional(),
    eval: z.string().max(32).optional(),
    movegen: z.string().max(32).optional(),
    search: z.string().max(32).optional(),
});

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

    const body = await readValidatedBody(event, body => CreateBotSchema.safeParse(body));
    if (!body.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Doesn't match schema."
        });
    };
    const data = body.data;

    const existing = await prisma.bot.findFirst({
        where: {
            id: botId,
        },
        include: {
            developers: true,
        }
    });
    if (existing === null) {
        throw createError({
            statusCode: 404,
            statusMessage: "Bot doesn't exist.",
        })
    };

    if (!existing.developers.find(developer => developer.id === profile.id)) {
        throw createError({
            statusCode: 404,
            statusMessage: "You aren't a developer for this bot.",
        })
    };

    const bot = await prisma.bot.update({
        where: {
            id: botId,
        },
        data: {
            team: data.team,
            name: data.name,
            avatar: data.avatar,
            language: data.language || null,
            eval: data.eval || null,
            movegen: data.movegen || null,
            search: data.search || null,
            developers: {
                connect: [{ id: profile.id }],
            },
        }
    });

    return bot;
});