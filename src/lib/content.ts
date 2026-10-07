import * as Crypto from 'expo-crypto';
import { authenticatedClient } from './supabase';
import { validateQuestionPayload } from '../domain/content.mjs';
import { config } from '../config';
import type { Question } from '../domain/types';
export interface ContentPack { packKey: string; version: string; approved: boolean; questions: Question[]; }
export async function downloadContentPack(userId:string): Promise<ContentPack> {
    const { client } = await authenticatedClient(userId);
    const { data, error } = await client.functions.invoke('content-pack', { body: { packKey: config.packKey } });
    if (error) throw new Error('Your study pack could not be requested. Check your connection and purchase access.');
    if (!data?.url || !/^https:\/\//.test(data.url) || !/^[a-f0-9]{64}$/.test(data.sha256) || !Number.isInteger(data.bytes) || data.bytes <= 0 || data.bytes > 15_000_000 || !Number.isInteger(data.questionCount)) throw new Error('The study pack manifest is invalid.');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
    try {
        const response = await fetch(data.url, { signal: controller.signal });
        if (!response.ok) throw new Error('The download link expired or the connection was interrupted. Please retry.');
        const length = Number(response.headers.get('content-length'));
        if (length > 15_000_000) throw new Error('The study download is too large.');
        const raw = await response.text();
        if (new TextEncoder().encode(raw).length !== data.bytes) throw new Error('The study download is incomplete. Please retry.');
        const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
        if (hash !== data.sha256) throw new Error('The study download failed its integrity check. Your previous pack is unchanged.');
        const pack: ContentPack = JSON.parse(raw);
        const errors = validateQuestionPayload(pack, { approved: true, expectedCount: data.questionCount, expectedVersion: data.version });
        if (errors.length) throw new Error('The study pack could not be validated. Please contact support.');
        return pack;
    } finally { clearTimeout(timer); }
}
