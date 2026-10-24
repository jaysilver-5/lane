import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== path.resolve(root)) throw new Error('Invalid public output directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Only these public files can enter this site's deployment artifact.
for (const name of ['index.html', 'styles.css', 'assets']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
console.log('Built the public FirstLane product page. No app, account or question data included.');
