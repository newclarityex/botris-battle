import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { Lucia, type User } from "lucia";
import { prisma } from "./prisma";
import { GitHub } from "arctic";

const adapter = new PrismaAdapter(prisma.session, prisma.user);
 
export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !process.dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			githubId: attributes.githubId,
		};
	}

});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
    githubId: number;
}

export const github = new GitHub(process.env.GITHUB_CLIENT_ID!, process.env.GITHUB_CLIENT_SECRET!);

export async function checkBotToken(token: string) {
    const botToken = await prisma.botToken.findUnique({
        where: {
            token,
        },
        include: {
            Bot: {
                include: {
                    developers: true,
                }
            },
        }
    });

    return botToken?.Bot ?? null;
}

export async function checkAuth(user: User | null) {
    if (!user) {
        return null;
    }

    const profile = await prisma.profile.findFirst({
        where: {
            id: user.id,
        }
    });

    return profile;
}