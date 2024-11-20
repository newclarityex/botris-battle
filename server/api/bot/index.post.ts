import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';
import { AvatarSchema } from '~/utils/avatar';
import { BOT_LIMIT } from '~/utils/general';

const CreateBotSchema = z.object({
    avatar: AvatarSchema,
    name: z.string().min(1).max(32),
    team: z.string().max(32).optional(),
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

    const botProfile = await prisma.profile.findFirstOrThrow({ 
        where: { id: profile.id }, 
        include: { 
            Bots: { 
                include: { developers: true}
            } 
        } 
    });

    if (botProfile.Bots.length > BOT_LIMIT) {
        throw createError({
            statusCode: 400,
            statusMessage: `Cannot create more than ${BOT_LIMIT} bots.`
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

    const bot = await prisma.bot.create({
        data: {
            name: data.name,
            team: data.team || null,
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