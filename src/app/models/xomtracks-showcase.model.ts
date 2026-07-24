export type ShareDirection = 'in' | 'out';
export type SharePlatform = 'spotify' | 'soundcloud' | 'apple' | string;

/**
 * A single compact share card, as returned by
 * `GET https://api.xomtracks.xomware.com/shares/recent`.
 * Title/artist/albumArtUrl can be null when a share hasn't resolved to a
 * matched track yet (pending/unmatched match status).
 */
export interface ShareCard {
  title: string | null;
  artist: string | null;
  albumArtUrl: string | null;
  platform: SharePlatform;
  /** Sharer display name. Null for outbound shares (Dom is the sender) — render as "You". */
  sharer: string | null;
  direction: ShareDirection;
  /** Epoch seconds (source: messageDate). */
  date: number;
}

/** The `data` payload of the `/shares/recent` envelope response. */
export interface XomtracksShowcase {
  sharedWithMe: ShareCard[];
  sharedByMe: ShareCard[];
  ownerId: string;
  limit: number;
  count: number;
}
