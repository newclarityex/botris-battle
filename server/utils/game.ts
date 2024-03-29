function getPps(currentTime: number, initialPps: number, finalPps: number, startMargin: number, endMargin: number) {
    const marginTime = currentTime - startMargin;
    const maxMarginTime = endMargin - startMargin;

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