/* Service worker: guarda a "casca" do app para abrir rápido e funcionar como aplicativo no celular.
   Os dados dos pacientes NÃO ficam aqui: sempre vêm do Supabase, com login.
   Ao publicar uma nova versão, troque o número abaixo (v1 -> v2) para o celular baixar a atualização. */
const VERSAO = 'thays-fisio-v3';
const CASCA = ['./', './index.html', './config.js', './dados.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca intercepta o Supabase (dados e login sempre direto do servidor)
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;
  const mesmoSite = url.origin === self.location.origin;
  const biblioteca = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!mesmoSite && !biblioteca) return;
  // Rede primeiro (pega sempre a versão mais nova); sem internet, usa a cópia guardada
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
