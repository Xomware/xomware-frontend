let played = false;

/**
 * Whether the landing should run the factory intro. True once per page load, so an in-app navigation back to /
 * goes straight to the page. Reduced motion never gets it.
 */
export function claimIntro(): boolean {
  if (played || typeof window === 'undefined' || !window.matchMedia) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  played = true;
  return true;
}
