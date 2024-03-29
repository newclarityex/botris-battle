import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';

const RegisterSchema = z.object({
    avatar: z.union([
        z.literal('I'),
        z.literal('O'),
        z.literal('L'),
        z.literal('J'),
        z.literal('S'),
        z.literal('Z'),
        z.literal('T'),
        z.literal(null),
    ]).array().length(8).array().length(8),
    name: z.string(),
    creator: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readBody(event);
    const data = RegisterSchema.parse(body);


    const newProfile = await prisma.profile.update({
        where: {
            id: profile.id
        },
        data: {
            creator: data.creator,
            name: data.name,
            avatar: data.avatar,
        }
    });

    return newProfile;
});