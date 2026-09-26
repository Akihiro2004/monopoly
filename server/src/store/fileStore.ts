import fs from 'fs/promises';
import path from 'path';
import { LeaderboardEntry } from '@monopoly/shared';
import { MatchRecord, ProfileStore, RoomStore, StoredRoom, rankPlayers } from '../rooms.js';

/**
 * Rooms saved as JSON files (one per room) so running games survive a
 * server restart or redeploy. Writes go to a temp file first and are then
 * renamed, so a crash never leaves a half-written room behind.
 */
export class FileRoomStore implements RoomStore, ProfileStore {
  constructor(private dir: string) {}

  private file(roomId: string): string {
    return path.join(this.dir, `${roomId.replace(/[^A-Z0-9]/gi, '')}.json`);
  }

  async loadAll(): Promise<StoredRoom[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const names = (await fs.readdir(this.dir)).filter((n) => n.endsWith('.json'));
    // Leftovers of an interrupted write.
    for (const n of (await fs.readdir(this.dir)).filter((f) => f.endsWith('.tmp'))) {
      await fs.rm(path.join(this.dir, n), { force: true });
    }
    const rooms: StoredRoom[] = [];
    for (const name of names) {
      try {
        rooms.push(JSON.parse(await fs.readFile(path.join(this.dir, name), 'utf8')) as StoredRoom);
      } catch (e) {
        console.warn(`Skipping unreadable room file ${name}`, e);
      }
    }
    return rooms;
  }

  async save(room: StoredRoom): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(room.roomId);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(room));
    await fs.rename(tmp, target);
  }

  async remove(roomId: string): Promise<void> {
    await fs.rm(this.file(roomId), { force: true });
  }

  private get matchesFile(): string {
    return path.join(this.dir, '..', 'matches.jsonl');
  }

  /** Finished games, one JSON line each (match history). */
  async recordMatch(match: MatchRecord): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.appendFile(this.matchesFile, JSON.stringify(match) + '\n');
  }

  async leaderboard(limit: number): Promise<LeaderboardEntry[]> {
    let text = '';
    try {
      text = await fs.readFile(this.matchesFile, 'utf8');
    } catch {
      return [];
    }
    const matches: MatchRecord[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        matches.push(JSON.parse(line));
      } catch {
        // skip a damaged line
      }
    }
    return rankPlayers(matches, limit);
  }
}
