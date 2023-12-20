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
    ]).array().length(8).array().length(8).optional(),
    name: z.string(),
    creator: z.string(),
});

const PIECES = ['I', 'O', 'L', 'J', 'S', 'Z', 'T', null];
function generateLine() {
    const line = [];
    for (let i = 0; i < 8; i++) {
        line.push(PIECES[Math.floor(Math.random() * PIECES.length)])
    }
    return line;
}

function generateAvatar() {
    const avatar = [];
    for (let i = 0; i < 8; i++) {
        avatar.push(generateLine())
    }
    return avatar;
}

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


    const profile = await prisma.profile.create({
        data: {
            id: session.user.id,
            creator: data.creator,
            name: data.name,
            avatar: data.avatar || generateAvatar(),
        }
    });

    return profile;
});