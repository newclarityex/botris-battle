import { getPieceMatrix } from 'libtris';
import * as PIXI from 'pixi.js';
import type { ClearName, PieceData, PublicGameState } from 'libtris'
import { ease } from 'pixi-ease';
import type { Bot } from '@prisma/client';

export const CELL_SIZE = 32;
const BOARD_HEIGHT = 21;
const PIECE_BORDER_SIZE = 4;

const HELD_DIMENSIONS = {
    width: 200,
    height: 200,
    x: 0,
    y: 0,
};

const BOARD_DIMENSIONS = {
    x: HELD_DIMENSIONS.width + 20,
    y: 0,
    width: 10 * CELL_SIZE,
    height: 21 * CELL_SIZE,
};

export type PlayerGraphics = {
    id: string;
    info: PublicBot;
    heldContainer: PIXI.Container | null;
    boardContainer: PIXI.Container | null;
    effectsContainer: PIXI.Container | null;
    queueContainer: PIXI.Container | null;
    damageBar: PIXI.Graphics | null;
};

type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

export const PIECE_COLORS = {
    "G": "#8a8a8a",
    "Z": "#ff004d",
    "L": "#f69504",
    "O": "#eee114",
    "S": "#00e436",
    "I": "#29adff",
    "J": "#2b5ae5",
    "T": "#c22fa1",
}

export function renderBlock(matrix: Block[][], x: number, y: number) {
    const row = matrix[y];
    const cell = matrix[y][x];
    if (cell === null) return null;

    const cellGraphics = new PIXI.Graphics();
    cellGraphics.beginFill(PIECE_COLORS[cell], 0.5);
    cellGraphics.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    cellGraphics.endFill();

    cellGraphics.beginFill(PIECE_COLORS[cell]);
    const topCell = y - 1 >= 0 ? matrix[y - 1][x] : null;
    const bottomCell = y + 1 < matrix.length ? matrix[y + 1][x] : null;
    const leftCell = x - 1 >= 0 ? matrix[y][x - 1] : null;
    const rightCell = x + 1 < row.length ? matrix[y][x + 1] : null;
    if (topCell !== cell) {
        cellGraphics.drawRect(0, 0, CELL_SIZE, PIECE_BORDER_SIZE);
    }
    if (bottomCell !== cell) {
        cellGraphics.drawRect(0, CELL_SIZE - PIECE_BORDER_SIZE, CELL_SIZE, PIECE_BORDER_SIZE);
    }
    if (leftCell !== cell) {
        cellGraphics.drawRect(0, 0, PIECE_BORDER_SIZE, CELL_SIZE);
    }
    if (rightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, 0, PIECE_BORDER_SIZE, CELL_SIZE);
    }

    const topLeftCell = y - 1 >= 0 && x - 1 >= 0 ? matrix[y - 1][x - 1] : null;
    const topRightCell = y - 1 >= 0 && x + 1 < row.length ? matrix[y - 1][x + 1] : null;
    const bottomLeftCell = y + 1 < matrix.length && x - 1 >= 0 ? matrix[y + 1][x - 1] : null;
    const bottomRightCell = y + 1 < matrix.length && x + 1 < row.length ? matrix[y + 1][x + 1] : null;

    if (topCell && leftCell && topLeftCell !== cell) {
        cellGraphics.drawRect(0, 0, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (topCell && rightCell && topRightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, 0, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (bottomCell && leftCell && bottomLeftCell !== cell) {
        cellGraphics.drawRect(0, CELL_SIZE - PIECE_BORDER_SIZE, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (bottomCell && rightCell && bottomRightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, CELL_SIZE - PIECE_BORDER_SIZE, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    return cellGraphics;
}

export function renderAvatar(avatar: Block[][]) {
    const avatarContainer = new PIXI.Container();
    avatarContainer.sortableChildren = true;

    for (let y = 0; y < avatar.length; y++) {
        const row = avatar[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(avatar, x, y);

            if (graphics) {
                graphics.x = x * CELL_SIZE;
                graphics.y = y * CELL_SIZE;
                avatarContainer.addChild(graphics);
            }
        }
    }

    const avatarBg = new PIXI.Graphics();
    avatarBg.beginFill(0x000000, 0.2);
    avatarBg.drawRect(0, 0, avatar[0].length * CELL_SIZE, avatar.length * CELL_SIZE);
    avatarBg.zIndex = -1;
    avatarContainer.addChild(avatarBg);

    return avatarContainer;
}

const GARBAGE_COLORS = [0xff0000, 0xff6600, 0xffff00, 0x00ffff, 0x0000ff, 0xff00ff]

export function renderState(playerGraphics: PlayerGraphics, gameState: PublicGameState | null) {
    const { heldContainer, boardContainer, queueContainer } = playerGraphics

    if (heldContainer === null || boardContainer === null || queueContainer === null) {
        console.error('Player graphics not initialized!');
        return;
    };

    heldContainer.removeChildren();
    boardContainer.removeChildren();
    queueContainer.removeChildren();

    if (gameState === null) return;

    // Render Board
    const { board, current, queue, held } = gameState;
    const reversedBoard = board.toReversed();
    for (let y = 0; y < reversedBoard.length; y++) {
        const row = reversedBoard[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(reversedBoard, x, y);

            if (graphics) {
                graphics.x = x * CELL_SIZE;
                graphics.y = (y + (BOARD_HEIGHT - board.length)) * CELL_SIZE;
                boardContainer.addChild(graphics);
            }
        }
    }

    // Render Current Piece
    const pieceMatrix = getPieceMatrix(current.piece, current.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(pieceMatrix, x, y);

            if (graphics) {
                graphics.x = (current.x + x) * CELL_SIZE;
                graphics.y = (y + BOARD_HEIGHT - current.y - 1) * CELL_SIZE;
                graphics.zIndex = 2;
                boardContainer.addChild(graphics);
            }
        }
    }

    // Render Held Piece
    if (held !== null) {
        const heldMatrix = getPieceMatrix(held, 0);
        const heldPieceContainer = new PIXI.Container();

        for (let y = 0; y < heldMatrix.length; y++) {
            const row = heldMatrix[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                if (cell === null) continue;

                const graphics = renderBlock(heldMatrix, x, y);
                if (!graphics) continue;

                graphics.x = x * CELL_SIZE;
                graphics.y = y * CELL_SIZE;
                heldPieceContainer.addChild(graphics);
            }
        }

        heldPieceContainer.x = HELD_DIMENSIONS.width / 2 - heldPieceContainer.width / 2;
        heldPieceContainer.y = 96;
        if (held === 'I') heldPieceContainer.y -= CELL_SIZE / 2;

        heldContainer.addChild(heldPieceContainer);
    }

    // Render Queue
    for (const [index, piece] of queue.entries()) {
        const pieceMatrix = getPieceMatrix(piece, 0);
        const pieceContainer = new PIXI.Container();

        for (let y = 0; y < pieceMatrix.length; y++) {
            const row = pieceMatrix[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                if (cell === null) continue;

                const graphics = renderBlock(pieceMatrix, x, y);

                if (graphics) {
                    graphics.x = x * CELL_SIZE;
                    graphics.y = y * CELL_SIZE;
                    pieceContainer.addChild(graphics);
                }
            }
        }

        pieceContainer.y = index * 3 * CELL_SIZE + 96;
        // 100 = Queue width / 2
        pieceContainer.x = 100 - pieceContainer.width / 2;
        if (piece === 'I') pieceContainer.y -= CELL_SIZE / 2;

        queueContainer.addChild(pieceContainer);
    }
}

export function renderDamage(playerGraphics: PlayerGraphics, gameState: PublicGameState | null) {
    const { damageBar } = playerGraphics;

    if (damageBar === null || gameState === null) return;

    damageBar.clear();

    // unnecessary but just in case ig
    let ascendingDelay = gameState.garbageQueued.toSorted((a, b) => a.delay - b.delay);
    for (const [index, line] of ascendingDelay.entries()) {
        damageBar.beginFill(GARBAGE_COLORS[line.delay], 0.75);
        damageBar.drawRect(0, -1 * CELL_SIZE * (index + 1), 8, CELL_SIZE);
    };

    damageBar.y = BOARD_HEIGHT * CELL_SIZE;
}

export function renderPlacedEffect(playerGraphics: PlayerGraphics, piece: PieceData) {
    const { effectsContainer } = playerGraphics;
    if (effectsContainer === null) return;

    const pieceMatrix = getPieceMatrix(piece.piece, piece.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            if (y > 0 && pieceMatrix[y - 1][x] !== null) continue;

            // const effectSprite = new PIXI.Sprite(PIXI.Texture.from(placedEffect));
            // effectSprite.tint = parseInt(PIECE_COLORS[cell].replace('#', '0x'));
            const effectSprite = new PIXI.Graphics();
            effectSprite.beginFill(parseInt(PIECE_COLORS[cell].replace('#', '0x')), 0.2);
            effectSprite.drawRect(0, 0, CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
            effectSprite.endFill();

            // effectSprite.x = 0;
            effectSprite.y = 0;
            effectSprite.x = (piece.x + x) * CELL_SIZE;
            // effectSprite.y = (y + BOARD_HEIGHT - piece.y - 5) * CELL_SIZE;

            effectsContainer.addChild(effectSprite);

            const fade = ease.add(
                effectSprite,
                { alpha: 0 },
                { duration: 250, ease: "easeOutQuad" }
            );

            fade.on("complete", () => {
                effectsContainer.removeChild(effectSprite);
            });
        }
    }
}

function randRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

const PIXEL_SIZE = 12;
export function renderClearEffect(playerGraphics: PlayerGraphics, lines: {
    height: number;
    blocks: Block[];
}[]) {
    const { effectsContainer } = playerGraphics;

    if (effectsContainer === null) return;

    for (const line of lines) {
        const { height: y, blocks } = line;

        for (let x = 0; x < blocks.length; x++) {
            const cell = blocks[x];
            if (cell === null) continue;

            const effectSprite = new PIXI.Graphics();
            effectSprite.beginFill(parseInt(PIECE_COLORS[cell].replace('#', '0x')), 0.5);
            effectSprite.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
            effectSprite.endFill();

            const xRange = [0, CELL_SIZE - PIXEL_SIZE];
            const yRange = [0, CELL_SIZE - PIXEL_SIZE];

            const startX = randRange(xRange[0], xRange[1]) + x * CELL_SIZE;
            const startY = randRange(yRange[0], yRange[1]) + (BOARD_HEIGHT - y - 1) * CELL_SIZE;
            effectSprite.x = startX;
            effectSprite.y = startY;

            const randomDirection = Math.random() * Math.PI * 2;
            const distance = randRange(0, 32);
            const targetX = startX + Math.cos(randomDirection) * distance;
            const targetY = startY + Math.sin(randomDirection) * distance;

            effectsContainer.addChild(effectSprite);

            const fade = ease.add(
                effectSprite,
                { alpha: 0, x: targetX, y: targetY },
                { duration: 750, ease: "easeOutQuad" }
            );

            fade.on("complete", () => {
                effectsContainer.removeChild(effectSprite);
            });
        }
    }
}

export function renderAttackEffect(playerGraphics: PlayerGraphics, piece: PieceData, damage: number) {
    const { effectsContainer } = playerGraphics;

    if (effectsContainer === null) return;

    const pieceMatrix = getPieceMatrix(piece.piece, piece.rotation);
    const x = pieceMatrix[0].length / 2;
    const y = pieceMatrix.length / 2;

    const effectSprite = new PIXI.Text(`+${damage}`, {
        fill: 0xFFFFFF,
        fontSize: 32,
        fontFamily: 'Fira Mono',
    });

    effectSprite.x = (piece.x + x) * CELL_SIZE - effectSprite.width / 2;
    effectSprite.x += randRange(-32, 32)
    effectSprite.y = (BOARD_HEIGHT - piece.y - y + 1) * CELL_SIZE - effectSprite.height / 2;
    effectSprite.y += randRange(-32, 32)

    effectsContainer.addChild(effectSprite);

    const fade = ease.add(
        effectSprite,
        { alpha: 0, y: effectSprite.y - 32 },
        { duration: 750, ease: "easeOutQuad" }
    );

    fade.on("complete", () => {
        effectsContainer.removeChild(effectSprite);
    });
}

export function renderComboEffect(playerGraphics: PlayerGraphics, piece: PieceData, damage: number) {
    const { effectsContainer } = playerGraphics;

    if (effectsContainer === null) return;

    const pieceMatrix = getPieceMatrix(piece.piece, piece.rotation);
    const x = pieceMatrix[0].length / 2;
    const y = pieceMatrix.length / 2;

    const effectSprite = new PIXI.Text(`x${damage}`, {
        fill: 0x5555FF,
        fontSize: 32,
        fontFamily: 'Fira Mono',
    });

    effectSprite.x = (piece.x + x) * CELL_SIZE - effectSprite.width / 2;
    effectSprite.x += randRange(-32, 32)
    effectSprite.y = (BOARD_HEIGHT - piece.y - y + 1) * CELL_SIZE - effectSprite.height / 2;
    effectSprite.y += randRange(-32, 32)

    effectsContainer.addChild(effectSprite);

    const fade = ease.add(
        effectSprite,
        { alpha: 0, y: effectSprite.y - 32 },
        { duration: 750, ease: "easeOutQuad" }
    );

    fade.on("complete", () => {
        effectsContainer.removeChild(effectSprite);
    });
}

export function renderClearName(playerGraphics: PlayerGraphics, clearName: ClearName) {
    const { effectsContainer } = playerGraphics;

    if (effectsContainer === null) return;

    const effectSprite = new PIXI.Text(`${clearName}`, {
        fill: 0xFFFFFF,
        fontSize: 32,
        fontFamily: 'Fira Mono',
    });

    effectSprite.x = BOARD_DIMENSIONS.width * 0.5 - effectSprite.width / 2;
    effectSprite.y = BOARD_DIMENSIONS.height * 0.25 - effectSprite.height / 2;

    effectsContainer.addChild(effectSprite);

    const fade = ease.add(
        effectSprite,
        { alpha: 0, y: effectSprite.y - 32 },
        { duration: 750, ease: "easeOutQuad" }
    );

    fade.on("complete", () => {
        effectsContainer.removeChild(effectSprite);
    });
}