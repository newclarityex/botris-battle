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
    if (event.context.user === null) {
        throw createError({
            statusCode: 401,
            message: 'You must be signed in to create your profile.'
        });
    }

    const body = await readValidatedBody(event, body => RegisterSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;


    const profile = await prisma.profile.create({
        data: {
            id: event.context.user.id,
            creator: data.creator,
            name: data.name,
            avatar: data.avatar || generateAvatar(),
        }
    });

    return profile;
});