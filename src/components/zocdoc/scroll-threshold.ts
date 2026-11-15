export function thresholdTracker(threshold: number): (scrollY: number) => boolean | undefined {
    let collapsed = false;
    return scrollY => {
        const next = scrollY > threshold;
        if (next === collapsed) return;
        collapsed = next;
        return next;
    };
}
