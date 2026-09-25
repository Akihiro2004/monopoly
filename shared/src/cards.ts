export type CardType = 'chance' | 'chest';

export type CardAction =
  | { type: 'money'; amount: number; text: string }
  | { type: 'moveTo'; tileIndex: number; passGoCheck: boolean; text: string }
  | { type: 'jail'; text: string }
  | { type: 'getOutOfJail'; text: string }
  | { type: 'collectFromAll'; amount: number; text: string }
  | { type: 'payToAll'; amount: number; text: string };

export interface CardDef {
  id: string;
  deck: CardType;
  action: CardAction;
}

export const CHANCE_CARDS: CardDef[] = [
  { id: 'ch_1', deck: 'chance', action: { type: 'moveTo', tileIndex: 0, passGoCheck: true, text: 'Advance to GO! Collect $200.' } },
  { id: 'ch_2', deck: 'chance', action: { type: 'moveTo', tileIndex: 24, passGoCheck: true, text: 'Advance to Illinois Ave.' } },
  { id: 'ch_3', deck: 'chance', action: { type: 'moveTo', tileIndex: 39, passGoCheck: false, text: 'Take a walk on Boardwalk.' } },
  { id: 'ch_4', deck: 'chance', action: { type: 'money', amount: 50, text: 'Bank pays you dividend of $50.' } },
  { id: 'ch_5', deck: 'chance', action: { type: 'getOutOfJail', text: 'Get Out of Jail Free card.' } },
  { id: 'ch_6', deck: 'chance', action: { type: 'jail', text: 'Go directly to Jail. Do not pass GO.' } },
  { id: 'ch_7', deck: 'chance', action: { type: 'money', amount: -15, text: 'Poor tax. Pay $15.' } },
  { id: 'ch_8', deck: 'chance', action: { type: 'collectFromAll', amount: 50, text: 'You have been elected Chairman. Collect $50 from each player.' } }
];

export const CHEST_CARDS: CardDef[] = [
  { id: 'cc_1', deck: 'chest', action: { type: 'moveTo', tileIndex: 0, passGoCheck: true, text: 'Advance to GO! Collect $200.' } },
  { id: 'cc_2', deck: 'chest', action: { type: 'money', amount: 200, text: 'Bank error in your favor. Collect $200.' } },
  { id: 'cc_3', deck: 'chest', action: { type: 'money', amount: -50, text: "Doctor's fees. Pay $50." } },
  { id: 'cc_4', deck: 'chest', action: { type: 'money', amount: 100, text: 'Holiday fund matures. Receive $100.' } },
  { id: 'cc_5', deck: 'chest', action: { type: 'getOutOfJail', text: 'Get Out of Jail Free card.' } },
  { id: 'cc_6', deck: 'chest', action: { type: 'jail', text: 'Go to Jail. Do not pass GO.' } },
  { id: 'cc_7', deck: 'chest', action: { type: 'collectFromAll', amount: 10, text: "It is your birthday. Collect $10 from every player." } },
  { id: 'cc_8', deck: 'chest', action: { type: 'money', amount: -100, text: 'Hospital fees. Pay $100.' } }
];
