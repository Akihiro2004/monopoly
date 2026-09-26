// Screen position of each card deck, so the 2D card animation can start
// exactly where the 3D deck sits on the board. The scene registers a
// projector; the UI asks for a point when a card is drawn.
export type DeckKind = 'chance' | 'chest';
type Projector = (deck: DeckKind) => { x: number; y: number } | null;

let projector: Projector | null = null;

export function setDeckProjector(fn: Projector | null): void {
  projector = fn;
}

export function projectDeck(deck: DeckKind): { x: number; y: number } | null {
  return projector ? projector(deck) : null;
}

// World positions of the top cards (see CenterBoard).
export const DECK_POS: Record<DeckKind, [number, number, number]> = {
  chance: [-3.6, 0.62, -3.4],
  chest: [3.6, 0.62, 3.2]
};
