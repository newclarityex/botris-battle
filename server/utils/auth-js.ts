// import type { H3Event } from 'h3';
// import { prisma } from './prisma';
// import { getServerSession } from '#auth';
// import { authOptions } from '../api/auth/[...]';

// export async function checkAuthToken(token: string) {
//     const apiToken = await prisma.apiToken.findUnique({
//         where: {
//             token,
//             OR: [
//                 {
//                     expires: null
//                 },
//                 {
//                     expires: {
//                         gt: new Date()
//                     }
//                 }
//             ]
//         },
//         include: {
//             Profile: true
//         }
//     });


//     return apiToken?.Profile ?? null;
// }

// export async function checkAuthHeader(event: H3Event) {
//     const auth = getRequestHeader(event, 'Authorization');

//     if (!auth) return null;

//     const arr = auth.split(' ');

//     if (arr.length !== 2) return null

//     const [_, token] = arr;

//     return await checkAuthToken(token);
// }

// export async function checkAuthSession(event: H3Event) {
//     const session = await getServerSession(event, authOptions)

//     if (!session?.user?.id) return null;

//     const profile = await prisma.profile.findUnique({
//         where: {
//             id: session.user.id
//         }
//     });

//     return profile ?? null;
// }

// export async function checkAuth(event: H3Event) {
//     return await checkAuthHeader(event) || await checkAuthSession(event);
// }