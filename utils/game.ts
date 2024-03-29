export type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

export function calculatePps(currentTime: number, initialPps: number, finalPps: number, startMargin: number, endMargin: number) {
    const startMarginMs = startMargin * 1000;
    const endMarginMs = endMargin * 1000;
    const marginTime = currentTime - startMarginMs;
    const maxMarginTime = endMarginMs - startMarginMs;

    if (marginTime < 0) {
        return initialPps;
    };

    if (marginTime >= maxMarginTime) {
        return finalPps;
    };
    
    const ppsRange = finalPps - initialPps;
    const ratio = marginTime / maxMarginTime;

    return initialPps + ppsRange * ratio;
}