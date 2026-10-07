import * as SQLite from 'expo-sqlite';
import type { LearnerState } from '../domain/types';
import type { ContentPack } from './content';
let opening: Promise<SQLite.SQLiteDatabase> | null = null;
async function database() {
    if (!opening) opening = (async () => {
        const db = await SQLite.openDatabaseAsync('firstlane-v1.db');
        await db.execAsync(`PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS learner_state (owner TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS owned_content_cache (owner TEXT NOT NULL, pack_key TEXT NOT NULL, version TEXT NOT NULL, payload TEXT NOT NULL, installed_at TEXT NOT NULL, PRIMARY KEY(owner,pack_key));
          CREATE TABLE IF NOT EXISTS owned_content_rollback (owner TEXT NOT NULL, pack_key TEXT NOT NULL, version TEXT NOT NULL, payload TEXT NOT NULL, installed_at TEXT NOT NULL, PRIMARY KEY(owner,pack_key));
          DROP TABLE IF EXISTS content_cache;`);
        return db;
    })().catch(error => { opening = null; throw error; });
    return opening;
}
export const storage = {
    async load(owner: string): Promise<LearnerState | null> { const row = await (await database()).getFirstAsync<{payload:string}>('SELECT payload FROM learner_state WHERE owner=?',owner); return row ? JSON.parse(row.payload) : null; },
    async save(owner: string, state: LearnerState) { await (await database()).runAsync('INSERT INTO learner_state(owner,payload) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET payload=excluded.payload',owner,JSON.stringify(state)); },
    async remove(owner: string) { await (await database()).runAsync('DELETE FROM learner_state WHERE owner=?',owner); },
    async loadPack(owner: string, key: string): Promise<ContentPack | null> { const row = await (await database()).getFirstAsync<{payload:string}>('SELECT payload FROM owned_content_cache WHERE owner=? AND pack_key=?',owner,key); return row ? JSON.parse(row.payload) : null; },
    async installPack(owner: string, pack: ContentPack) {
        const db = await database();
        // An exclusive transaction preserves the last working version if a write fails.
        await db.withExclusiveTransactionAsync(async tx => {
            await tx.runAsync('INSERT OR REPLACE INTO owned_content_rollback SELECT * FROM owned_content_cache WHERE owner=? AND pack_key=?',owner,pack.packKey);
            await tx.runAsync('INSERT OR REPLACE INTO owned_content_cache(owner,pack_key,version,payload,installed_at) VALUES(?,?,?,?,?)',owner,pack.packKey,pack.version,JSON.stringify(pack),new Date().toISOString());
        });
    },
    async rollbackPack(owner: string, key: string) { const db=await database(); await db.withExclusiveTransactionAsync(async tx=> { await tx.runAsync('INSERT OR REPLACE INTO owned_content_cache SELECT * FROM owned_content_rollback WHERE owner=? AND pack_key=?',owner,key); await tx.runAsync('DELETE FROM owned_content_rollback WHERE owner=? AND pack_key=?',owner,key); }); },
    async removePack(owner: string, key: string) { const db=await database(); await db.withExclusiveTransactionAsync(async tx=> { await tx.runAsync('DELETE FROM owned_content_cache WHERE owner=? AND pack_key=?',owner,key); await tx.runAsync('DELETE FROM owned_content_rollback WHERE owner=? AND pack_key=?',owner,key); }); },
};
