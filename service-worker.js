/* service-worker.js
   Service worker do Nexus Escolar — habilita a instalação como app (PWA)
   e um cache básico "app shell" para os arquivos estáticos, permitindo
   abrir a interface mesmo sem conexão (os dados seguem sendo simulados
   localmente, então isso não depende de rede).

   Estratégia: network-first para os arquivos do app shell (HTML/CSS/JS) —
   sempre busca a versão mais nova na rede primeiro, e só usa o cache como
   reserva quando estiver offline. Isso evita que o usuário fique preso
   numa versão antiga em cache depois de uma atualização do sistema.
*/

const CACHE_VERSION = "nexus-escolar-v2";
const ARQUIVOS_APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/script.js",
  "./js/neon-client.js",
  "./js/qrcode.js",
  "./js/qrcode.lib.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./favicon-32.png",
  "./favicon-16.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(ARQUIVOS_APP_SHELL).catch(() => {
        // Se algum arquivo individual falhar (ex.: ainda não publicado),
        // não impede a instalação do restante do app shell.
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_VERSION)
          .map((chave) => caches.delete(chave))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  // Só intercepta GET; deixa POST (ex.: chamadas para /api/*) passar direto pela rede.
  if (requisicao.method !== "GET") return;

  // Nunca cacheia chamadas de API — precisam sempre de uma resposta atual.
  if (requisicao.url.includes("/api/")) return;

  // Network-first: tenta a rede primeiro (garante a versão mais nova);
  // se falhar (offline), cai para o cache; se também não houver cache,
  // deixa o erro normal de rede acontecer.
  evento.respondWith(
    fetch(requisicao)
      .then((respostaRede) => {
        if (respostaRede && respostaRede.ok) {
          const copia = respostaRede.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(requisicao, copia));
        }
        return respostaRede;
      })
      .catch(() => caches.match(requisicao))
  );
});
