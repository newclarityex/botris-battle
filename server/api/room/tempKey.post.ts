import {
	createRoomKey,
	getPublicRoomData,
	rooms,
} from "@/server/utils/rooms";
import { z } from "zod";

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

	const body = await readValidatedBody(event, body => z
		.object({
			roomId: z.string(),
		}).safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

	const room = rooms.get(data.roomId);

	if (!room) {
		throw createError({
			statusCode: 404,
			message: "Room not found",
		});
	}

    if (room.host.id !== profile.id) {
        throw createError({
            statusCode: 401,
            statusMessage: "You aren't the host for this room."
        });
    };

	const roomKey = await prisma.roomKey.create({
		data: {
			key: createRoomKey(),
			roomId: room.id,
			singleUse: true,
		},
	});

	return roomKey;
});
