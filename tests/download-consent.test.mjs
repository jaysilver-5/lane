import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/lib/content.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function fixture({ approve = true, invalid = false, corrupt = false } = {}) {
    const raw = JSON.stringify({ packKey: 'CA-ON-G1', version: '1', approved: true, questions: [] });
    const bytes = new TextEncoder().encode(raw).length;
    const events = [];
    const manifest = { url: 'https://storage.example.test/pack', sha256: 'a'.repeat(64), bytes: invalid ? -1 : bytes, questionCount: 500, version: '1' };
    const modules = {
        'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async () => corrupt ? 'b'.repeat(64) : manifest.sha256 },
        './supabase': { authenticatedClient: async () => ({ client: { functions: { invoke: async () => ({ data: manifest }) } } }) },
        '../domain/content.mjs': { validateQuestionPayload: () => [] },
        '../config': { config: { packKey: 'CA-ON-G1' } },
        './downloadConsent': { confirmPackDownload: async size => { events.push(['consent', size]); return approve; } },
    };
    const context = { exports: {}, require: name => { assert.ok(modules[name], name); return modules[name]; }, AbortController, TextEncoder, setTimeout, clearTimeout,
        fetch: async () => { events.push(['fetch']); return { ok: true, headers: { get: () => String(bytes) }, text: async () => raw }; } };
    vm.runInNewContext(js, context);
    return { run: () => context.exports.downloadContentPack('learner'), events, bytes };
}
test('declining the disclosed pack download never fetches the content file', async () => {
    const f = fixture({ approve: false });
    await assert.rejects(f.run(), /Download cancelled/);
    assert.deepEqual(f.events, [['consent', f.bytes]]);
});
test('the exact manifest size is disclosed before an approved download starts', async () => {
    const f = fixture();
    assert.equal((await f.run()).approved, true);
    assert.deepEqual(f.events, [['consent', f.bytes], ['fetch']]);
});
test('invalid manifests cannot prompt for consent or start a download', async () => {
    const f = fixture({ invalid: true });
    await assert.rejects(f.run(), /manifest is invalid/);
    assert.deepEqual(f.events, []);
});
test('consent does not bypass downloaded-pack integrity checks', async () => {
    const f = fixture({ corrupt: true });
    await assert.rejects(f.run(), /integrity check/);
});
