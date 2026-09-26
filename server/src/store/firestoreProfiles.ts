import type { Firestore } from 'firebase-admin/firestore';
import { LeaderboardEntry } from '@monopoly/shared';
import { MatchRecord, ProfileStore, sortBoard } from '../rooms.js';
import { firebaseApp } from '../firebase.js';

/**
 * Player profiles in Firestore, kept tiny for the free plan: one document per
 * player in `players` ({ name, wins, gamesPlayed, bestScore, updatedAt }).
 *  - Writes: one per player, once per finished game (a batch).
 *  - Reads: the leaderboard query, which the server caches for minutes.
 * Running games are NOT stored here (they stay on the game server).
 */
export class FirestoreProfiles implements ProfileStore {
  private constructor(private db: Firestore) {}

  static async create(): Promise<FirestoreProfiles> {
    const app = await firebaseApp();
    if (!app) throw new Error('Firebase is not configured');
    const { getFirestore } = await import('firebase-admin/firestore');
    return new FirestoreProfiles(getFirestore(app));
  }

  async recordMatch(match: MatchRecord): Promise<void> {
    const { FieldValue } = await import('firebase-admin/firestore');
    const refs = match.players.map((p) => this.db.collection('players').doc(p.playerId));
    // One transaction: read the (at most 6) profiles to keep the best score,
    // then write each once.
    await this.db.runTransaction(async (tx) => {
      const docs = await tx.getAll(...refs);
      match.players.forEach((p, i) => {
        const best = Number(docs[i].get('bestScore') ?? 0);
        tx.set(
          refs[i],
          {
            name: p.name,
            account: !!p.account,
            gamesPlayed: FieldValue.increment(1),
            wins: FieldValue.increment(p.playerId === match.winnerId ? 1 : 0),
            bestScore: Math.max(best, p.netWorth),
            updatedAt: match.finishedAt
          },
          { merge: true }
        );
      });
    });
  }

  async leaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const snap = await this.db.collection('players').orderBy('wins', 'desc').limit(limit).get();
    return sortBoard(
      snap.docs.map((d) => ({
        playerId: d.id,
        name: String(d.get('name') ?? 'Player'),
        wins: Number(d.get('wins') ?? 0),
        gamesPlayed: Number(d.get('gamesPlayed') ?? 0),
        bestScore: Number(d.get('bestScore') ?? 0),
        account: !!d.get('account')
      }))
    );
  }
}
