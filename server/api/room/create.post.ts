import { z } from "zod";
import { createRoomToken, rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";
import { customAlphabet, nanoid } from "nanoid";
import { numbers, lowercase } from "nanoid-dictionary";
import { Block } from "~/utils/game";

const genRoomId = customAlphabet(numbers + lowercase, 8);

const CreateGameSchema = z.object({
	private: z.boolean(),
	ft: z.number().min(1).max(99),
	// maxPlayers: z.number().min(2).max(4),
	ppsCap: z.number().gt(0).max(30),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

	const body = await readBody(event);
	const data = CreateGameSchema.parse(body);

	let roomId = genRoomId();
	while (rooms.has(roomId)) {
		roomId = nanoid();
	}

	const match = {
		id: roomId,
		host: {
			userId: profile.id,
			creator: profile.creator,
			bot: profile.name,
			avatar: profile.avatar as Block[][],
		},
		private: data.private,
		ft: data.ft,
		maxPlayers: 2,
		ppsCap: data.ppsCap,
		gameOngoing: false,
		roundOngoing: false,
		startedAt: null,
		endedAt: null,
		lastWinner: null,
		banned: new Map(),
		players: new Map(),
		spectators: new Map(),
	};

	rooms.set(roomId, match);

	await prisma.roomToken.create({
		data: {
			token: createRoomToken(),
			roomId,
			singleUse: false,
		},
	});

	return {
		roomId,
	};
});
