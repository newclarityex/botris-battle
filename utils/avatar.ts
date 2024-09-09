import type { Bot } from '@prisma/client';
import z from 'zod';

type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T'
export const AVATAR_SIZE: number = 10
const PIECES: (Piece | null)[] = ['I', 'O', 'L', 'J', 'S', 'Z', 'T'];

function generateLine() {
    const line: (Piece | null)[] = [];
    for (let i = 0; i < AVATAR_SIZE / 2; i++) {
        if (Math.random() < 0.6) {
            line.push(null)
        } else {
            line.push(PIECES[Math.floor(Math.random() * PIECES.length)])
        }

    }
    return line;
}

function generateSquare() {
    const square = [];
    for (let i = 0; i < AVATAR_SIZE / 2; i++) {
        square.push(generateLine())
    }
    return square;
}

export function generateEmptyAvatar() {
    const avatar: (Piece | null)[][] = []

    for (let i = 0; i < AVATAR_SIZE; i++) {
        const line: (Piece | null)[] = []
        for (let j = 0; j < AVATAR_SIZE; j++) {
            line.push(null)
        }
        avatar.push(line)
    }
    
    return avatar
}


export function generateRandomAvatar() {
    const square = generateSquare()
    const topLeft = square
    const topRight = square.map(row => row.toReversed())
    const bottomRight = square.map(row => row.toReversed()).toReversed()
    const bottomLeft = square.toReversed()
    const avatar: (Piece | null)[][] = []

    for (let i = 0; i < AVATAR_SIZE / 2; i++) {
        const line: (Piece | null)[] = []
        line.push(...topLeft[i])
        line.push(...topRight[i])
        avatar.push(line)
    }
    for (let i = 0; i < AVATAR_SIZE / 2; i++) {
        const line: (Piece | null)[] = []
        line.push(...bottomLeft[i])
        line.push(...bottomRight[i])
        avatar.push(line)
    }
    return avatar
}

export const AvatarSchema = z.union([
    z.literal('I'),
    z.literal('O'),
    z.literal('L'),
    z.literal('J'),
    z.literal('S'),
    z.literal('Z'),
    z.literal('T'),
    z.literal('G'),
    z.literal(null),
]).array().length(AVATAR_SIZE).array().length(AVATAR_SIZE);

export type Avatar = z.infer<typeof AvatarSchema>
