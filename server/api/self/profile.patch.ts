import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';
import { getServerSession, getServerToken } from "#auth"
import { authOptions } from "../auth/[...]";

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
    ]).array().length(10).array().length(10),
    name: z.string(),
    creator: z.string(),
});

export default defineEventHandler(async (event) => {
    const session = await getServerSession(event, authOptions)

    if (!session?.user?.id) {
        throw createError({
            statusCode: 401,
            message: 'You must be sign in to create your profile.'
        });
    }

    const body = await readBody(event);
    const data = RegisterSchema.parse(body);


    const profile = await prisma.profile.update({
        where: {
            id: session.user.id
        },
        data: {
            creator: data.creator,
            name: data.name,
            avatar: data.avatar,
        }
    });

    return profile;
});