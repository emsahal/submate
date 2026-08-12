import { readFileSync, writeFileSync } from 'fs';
const content = readFileSync('shared/types.ts', 'utf8');
writeFileSync('frontend/src/types/shared.ts', content);
console.log('Copied shared types!');
