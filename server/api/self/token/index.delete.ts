import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const DeleteTokenSchema = z.object({
    token: z.string(),
});

export default defineEventHandler(async (event) => {
    const profile = await checkAuth(event);
    if (!profile) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized'
        });
    }

    const body = await readBody(event);
    const data = DeleteTokenSchema.parse(body);

    await prisma.apiToken.delete({
        where: {
            token: data.token,
        }
    });

    return {
        success: true,
    };
});