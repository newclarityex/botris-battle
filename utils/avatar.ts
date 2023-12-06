type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T'
const CELL_NUMBER: number = 8
const PIECES: (Piece | null)[] = ['I', 'O', 'L', 'J', 'S', 'Z', 'T'];

function generateLine() {
    const line: (Piece | null)[] = [];
    for (let i = 0; i < CELL_NUMBER / 2; i++) {
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
    for (let i = 0; i < CELL_NUMBER / 2; i++) {
        square.push(generateLine())
    }
    return square;
}

export function generateAvatar() {
    const square = generateSquare()
    const topLeft = square
    const topRight = square.map(row => row.toReversed())
    const bottomRight = square.map(row => row.toReversed()).toReversed()
    const bottomLeft = square.toReversed()
    const avatar: (Piece | null)[][] = []

    for (let i = 0; i < CELL_NUMBER / 2; i++) {
        const line: (Piece | null)[] = []
        line.push(...topLeft[i])
        line.push(...topRight[i])
        avatar.push(line)
    }
    for (let i = 0; i < CELL_NUMBER / 2; i++) {
        const line: (Piece | null)[] = []
        line.push(...bottomLeft[i])
        line.push(...bottomRight[i])
        avatar.push(line)
    }
    console.log('avatar', avatar)
    return avatar
}