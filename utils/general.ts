import type { Prisma, Profile } from "@prisma/client";

export function sleep(ms: number) {
	return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export type PublicDeveloper = {
	id: string;
	displayName: string;
}

export type PublicBot = {
	id: string;
	name: string;
	avatar: Avatar;
	team: string | null;
	language: string | null;
	eval: string | null;
	movegen: string | null;
	search: string | null;
	developers: PublicDeveloper[];
}

export function getBotCreator(bot: PublicBot) {
	return bot.team ?? bot.developers.map(dev => dev.displayName).join(", ");
}

export const BOT_LIMIT = 10;