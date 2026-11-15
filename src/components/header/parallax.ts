export function parallaxValues(scrollY: number, height: number) {
  const percentage = Math.min(Math.max(scrollY / Math.max(height, 1), 0), 1);
  const backgroundOpacity = Math.min(Math.pow(percentage, 1 - percentage), 1);
  return {
    backgroundOpacity,
    textTranslation: backgroundOpacity === 1 ? 100 : percentage * 30,
  };
}

/** Connect frame-coalesced scrolling without depending on React or its render lifecycle. */
export function observeParallax(
  view: Window,
  apply: (reducedMotion: boolean) => void,
): () => void {
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  let frame: number | undefined;
  const update = () => {
    frame = undefined;
    apply(false);
  };
  const schedule = () => {
    if (motion.matches || frame !== undefined) return;
    frame = view.requestAnimationFrame(update);
  };
  const changed = () => {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
    if (motion.matches) apply(true);
    else schedule();
  };
  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', schedule);
  motion.addEventListener('change', changed);
  changed();
  return () => {
    view.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', schedule);
    motion.removeEventListener('change', changed);
    if (frame !== undefined) view.cancelAnimationFrame(frame);
  };
}
