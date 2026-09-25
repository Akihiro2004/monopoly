// Bundled fonts for drei <Text>. Without an explicit font, troika fetches one
// from a public CDN at runtime, which leaves the board blank offline/on LAN.
import textFont from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import boldFont from '@fontsource/inter/files/inter-latin-800-normal.woff?url';

export const TEXT_FONT = textFont;
export const BOLD_FONT = boldFont;
