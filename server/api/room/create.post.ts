import { z } from 'zod';
import { rooms } from '~/server/utils/rooms'
import { getServerSession } from '#auth';
import { authOptions } from '../auth/[...]';
import { Profile } from '@prisma/client';
import { checkAuth } from '~/server/utils/auth';

const CreateGameSchema = z.object({
    roomId: z.string(),
    public: z.boolean(),
    ft: z.number(),
    maxPlayers: z.number(),
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
    const data = CreateGameSchema.parse(body);

    if (rooms.has(data.roomId)) {
        throw new Error('Room already exists');
    }

    const match = {
        id: data.roomId,
        host: {
            playerId: profile.id,
            creator: profile.creator,
            bot: profile.name,
        },
        public: data.public,
        ft: data.ft,
        maxPlayers: data.maxPlayers,
        ongoing: false,
        banned: new Set() as Set<string>,
        players: new Map(),
        spectators: new Map(),
    };

    rooms.set(data.roomId, match);

    return {
        roomId: data.roomId,
    }
});