export type CardType = 'chance' | 'chest';

// Card actions (the classic US Monopoly decks, mapped onto the world board).
export type CardAction =
  | { type: 'money'; amount: number; text: string } // + collect from Bank, - pay the Bank
  | { type: 'moveTo'; tileIndex: number; text: string } // collect $200 if passing GO
  | { type: 'moveBack'; spaces: number; text: string }
  | { type: 'nearest'; kind: 'railroad' | 'utility'; text: string }
  | { type: 'jail'; text: string }
  | { type: 'getOutOfJail'; text: string }
  | { type: 'collectFromAll'; amount: number; text: string }
  | { type: 'payToAll'; amount: number; text: string }
  | { type: 'repairs'; perHouse: number; perHotel: number; text: string };

export interface CardDef {
  id: string;
  deck: CardType;
  title: string;
  action: CardAction;
}

// Chance (16). Boardwalk = New York, Illinois Ave = London,
// St. Charles Place = Beijing, Reading Railroad = Changi Airport.
export const CHANCE_CARDS: CardDef[] = [
  { id: 'ch_newyork', deck: 'chance', title: 'Advance to New York', action: { type: 'moveTo', tileIndex: 39, text: 'Advance to New York.' } },
  { id: 'ch_go', deck: 'chance', title: 'Advance to GO', action: { type: 'moveTo', tileIndex: 0, text: 'Advance to GO. Collect $200.' } },
  { id: 'ch_london', deck: 'chance', title: 'Advance to London', action: { type: 'moveTo', tileIndex: 24, text: 'Advance to London. If you pass GO, collect $200.' } },
  { id: 'ch_beijing', deck: 'chance', title: 'Advance to Beijing', action: { type: 'moveTo', tileIndex: 11, text: 'Advance to Beijing. If you pass GO, collect $200.' } },
  { id: 'ch_airport1', deck: 'chance', title: 'Nearest Airport', action: { type: 'nearest', kind: 'railroad', text: 'Advance to the nearest Airport. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rent they are otherwise entitled to.' } },
  { id: 'ch_airport2', deck: 'chance', title: 'Nearest Airport', action: { type: 'nearest', kind: 'railroad', text: 'Advance to the nearest Airport. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rent they are otherwise entitled to.' } },
  { id: 'ch_utility', deck: 'chance', title: 'Nearest Utility', action: { type: 'nearest', kind: 'utility', text: 'Advance to the nearest Utility. If unowned, you may buy it from the Bank. If owned, throw the dice and pay the owner ten times the amount thrown.' } },
  { id: 'ch_dividend', deck: 'chance', title: 'Dividend', action: { type: 'money', amount: 50, text: 'Bank pays you a dividend of $50.' } },
  { id: 'ch_jailfree', deck: 'chance', title: 'Get Out of Jail Free', action: { type: 'getOutOfJail', text: 'Get Out of Jail Free. Keep this card until needed, or trade it.' } },
  { id: 'ch_back3', deck: 'chance', title: 'Go Back 3 Spaces', action: { type: 'moveBack', spaces: 3, text: 'Go back 3 spaces.' } },
  { id: 'ch_jail', deck: 'chance', title: 'Go to Jail', action: { type: 'jail', text: 'Go directly to Jail. Do not pass GO, do not collect $200.' } },
  { id: 'ch_repairs', deck: 'chance', title: 'General Repairs', action: { type: 'repairs', perHouse: 25, perHotel: 100, text: 'Make general repairs on all your property: pay $25 for each house and $100 for each hotel.' } },
  { id: 'ch_speeding', deck: 'chance', title: 'Speeding Fine', action: { type: 'money', amount: -15, text: 'Speeding fine. Pay $15.' } },
  { id: 'ch_changi', deck: 'chance', title: 'Take a Trip', action: { type: 'moveTo', tileIndex: 5, text: 'Take a trip to Changi Airport. If you pass GO, collect $200.' } },
  { id: 'ch_chairman', deck: 'chance', title: 'Chairman of the Board', action: { type: 'payToAll', amount: 50, text: 'You have been elected Chairman of the Board. Pay each player $50.' } },
  { id: 'ch_loan', deck: 'chance', title: 'Building Loan', action: { type: 'money', amount: 150, text: 'Your building loan matures. Collect $150.' } }
];

// Community Chest (16).
export const CHEST_CARDS: CardDef[] = [
  { id: 'cc_go', deck: 'chest', title: 'Advance to GO', action: { type: 'moveTo', tileIndex: 0, text: 'Advance to GO. Collect $200.' } },
  { id: 'cc_bankerror', deck: 'chest', title: 'Bank Error', action: { type: 'money', amount: 200, text: 'Bank error in your favor. Collect $200.' } },
  { id: 'cc_doctor', deck: 'chest', title: "Doctor's Fee", action: { type: 'money', amount: -50, text: "Doctor's fee. Pay $50." } },
  { id: 'cc_stock', deck: 'chest', title: 'Sale of Stock', action: { type: 'money', amount: 50, text: 'From sale of stock you get $50.' } },
  { id: 'cc_jailfree', deck: 'chest', title: 'Get Out of Jail Free', action: { type: 'getOutOfJail', text: 'Get Out of Jail Free. Keep this card until needed, or trade it.' } },
  { id: 'cc_jail', deck: 'chest', title: 'Go to Jail', action: { type: 'jail', text: 'Go directly to Jail. Do not pass GO, do not collect $200.' } },
  { id: 'cc_holiday', deck: 'chest', title: 'Holiday Fund', action: { type: 'money', amount: 100, text: 'Holiday fund matures. Receive $100.' } },
  { id: 'cc_taxrefund', deck: 'chest', title: 'Tax Refund', action: { type: 'money', amount: 20, text: 'Income tax refund. Collect $20.' } },
  { id: 'cc_birthday', deck: 'chest', title: 'Happy Birthday', action: { type: 'collectFromAll', amount: 10, text: 'It is your birthday. Collect $10 from every player.' } },
  { id: 'cc_life', deck: 'chest', title: 'Life Insurance', action: { type: 'money', amount: 100, text: 'Life insurance matures. Collect $100.' } },
  { id: 'cc_hospital', deck: 'chest', title: 'Hospital Fees', action: { type: 'money', amount: -100, text: 'Pay hospital fees of $100.' } },
  { id: 'cc_school', deck: 'chest', title: 'School Fees', action: { type: 'money', amount: -50, text: 'Pay school fees of $50.' } },
  { id: 'cc_consult', deck: 'chest', title: 'Consultancy Fee', action: { type: 'money', amount: 25, text: 'Receive a $25 consultancy fee.' } },
  { id: 'cc_street', deck: 'chest', title: 'Street Repairs', action: { type: 'repairs', perHouse: 40, perHotel: 115, text: 'You are assessed for street repairs: $40 per house and $115 per hotel.' } },
  { id: 'cc_beauty', deck: 'chest', title: 'Beauty Contest', action: { type: 'money', amount: 10, text: 'You have won second prize in a beauty contest. Collect $10.' } },
  { id: 'cc_inherit', deck: 'chest', title: 'Inheritance', action: { type: 'money', amount: 100, text: 'You inherit $100.' } }
];
