import { z } from 'zod';
import { rooms } from '~/server/utils/rooms'
import { checkAuth } from '~/server/utils/auth';

const CreateGameSchema = z.object({
    roomId: z.string(),
    public: z.boolean(),
    ft: z.number().min(1).max(99),
    maxPlayers: z.number().min(2).max(4),
    ppsCap: z.number().gt(0).max(30),
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
            userId: profile.id,
            creator: profile.creator,
            bot: profile.name,
        },
        public: data.public,
        ft: data.ft,
        maxPlayers: data.maxPlayers,
        ppsCap: data.ppsCap,
        allowInputs: false,
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