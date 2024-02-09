import {
	createRoomKey,
	getPublicRoomData,
	rooms,
} from "@/server/utils/rooms";
import { z } from "zod";
import { getServerSession, getServerToken } from "#auth";
import { authOptions } from "../auth/[...]";

export default defineEventHandler(async (event) => {
	const session = await getServerSession(event, authOptions);
	if (!session?.user?.id) {
		throw createError({
			statusCode: 401,
			message: "You must be sign in to view your profile.",
		});
	}

	const body = await readBody(event);
	const parsed = z
		.object({
			roomId: z.string(),
		})
		.safeParse(body);

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: "Invalid room ID",
		});
	}

	const room = rooms.get(parsed.data.roomId);

	if (!room) {
		throw createError({
			statusCode: 404,
			message: "Room not found",
		});
	}

	if (room.host.userId !== session.user.id) {
		throw createError({
			statusCode: 403,
			message: "You are not the owner of this room",
		});
	}

	const roomKey = await prisma.roomKey.create({
		data: {
			key: createRoomKey(),
			roomId: room.id,
			singleUse: true,
		},
	});

	return roomKey;
});
