export type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

export function calculateMessiness(currentTime: number, initialMessiness: number, finalMessiness: number, startMargin: number, endMargin: number) {
    const startMarginMs = startMargin * 1000;
    const endMarginMs = endMargin * 1000;
    const marginTime = currentTime - startMarginMs;
    const maxMarginTime = endMarginMs - startMarginMs;

    if (marginTime < 0) {
        return initialMessiness;
    };

    if (marginTime >= maxMarginTime) {
        return finalMessiness;
    };

    const messinessRange = finalMessiness - initialMessiness;
    const ratio = marginTime / maxMarginTime;

    return initialMessiness + messinessRange * ratio;
}