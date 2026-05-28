export interface Agent {
  id: string;
  name: string;
  specialty: string;
  description: string;
  /**
   * Drives the card's CSS theming.
   * - `primary` / `secondary`: hex colors for the avatar gradient + accents.
   * - `glow`: an `r, g, b` triplet (no `rgb()` wrapper) so the SCSS can compose
   *   it into `rgba(var(--agent-glow), <alpha>)` for hover glows and tints.
   */
  color: { primary: string; secondary: string; glow: string };
  /** Visual style key used to pick the CSS-art avatar variant. */
  visualStyle:
    | 'geometric'
    | 'angular'
    | 'flowing'
    | 'industrial'
    | 'ripple'
    | 'glitch';
}
