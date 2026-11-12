// Copia os arquivos do site para a pasta www/, que é o que vai dentro do aplicativo (Android e iOS).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
const ARQUIVOS = ['index.html', 'config.js', 'dados.js', 'sw.js', 'manifest.webmanifest', 'icons'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const a of ARQUIVOS) cpSync(a, `www/${a}`, { recursive: true });
console.log('Arquivos do site copiados para www/');
