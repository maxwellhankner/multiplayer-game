/** Standard in-game player name font (DOM + canvas). */
export const GAME_PLAYER_NAME_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** Hoe Down Derby keeps western display type on canvas labels. */
export const HOE_DOWN_PLAYER_NAME_FONT = "'Rye', serif";

export function gamePlayerNameCanvasFont(sizePx: number, weight = 600): string {
  return `${weight} ${sizePx}px ${GAME_PLAYER_NAME_FONT}`;
}
