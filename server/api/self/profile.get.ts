
import { getServerSession, getServerToken } from "#auth"
import { authOptions } from "../auth/[...]";
import { prisma } from "@/server/utils/prisma";

export default defineEventHandler(async (event) => {
    const session = await getServerSession(event, authOptions)
    if (!session?.user?.id) {
        throw createError({
            statusCode: 401,
            message: 'You must be sign in to view your profile.'
        });
    }

    const profile = await prisma.profile.findUnique({
        where: {
            id: session.user.id
        }
    });

    if (!profile) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        });
    }

    return profile;
})