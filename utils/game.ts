export type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

export function calculateMultiplier(currentTime: number, initialMultiplier: number, finalMultiplier: number, startMargin: number, endMargin: number) {
    const startMarginMs = startMargin * 1000;
    const endMarginMs = endMargin * 1000;
    const marginTime = currentTime - startMarginMs;
    const maxMarginTime = endMarginMs - startMarginMs;

    if (marginTime < 0) {
        return initialMultiplier;
    };

    if (marginTime >= maxMarginTime) {
        return finalMultiplier;
    };

    const multiplierRange = finalMultiplier - initialMultiplier;
    const ratio = marginTime / maxMarginTime;

    return initialMultiplier + multiplierRange * ratio;
}