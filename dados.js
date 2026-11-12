/* =====================================================================
   dados.js — camada de dados e login do app Thays Jesus Fisioterapia
   ---------------------------------------------------------------------
   Usa o Supabase (banco Postgres + login) no lugar do banco do Claude.
   Login por CPF e senha: o CPF vira o usuário interno <cpf>@LOGIN_DOMINIO
   (só números), porque o Supabase exige e-mail ou telefone.
   Todos os registros ficam numa única tabela "docs":
     colecao  -> pacientes | sessoes | pacotes | planos | recebimentos | config
     id       -> identificador do registro
     data     -> conteúdo (JSON)
   A segurança fica no banco (Row Level Security): só usuários da tabela
   "membros" leem ou gravam. A chave "anon" do config.js é pública por
   natureza; sem login e sem estar em "membros", ela não dá acesso a nada.
   ===================================================================== */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const configurado = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !/COLE_AQUI/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY) && window.supabase);
  if (!configurado) { window.Dados = { configurado: false }; return; }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const cache = new Map();        // colecao -> Map(id -> data)
  const carregadas = new Set();   // coleções já lidas do servidor
  const carregando = new Map();   // colecao -> Promise
  const ouvintes = new Map();     // colecao -> Set({next, error})
  const ouvintesDoc = new Map();  // "colecao/id" -> Set({next, error})
  let canal = null;

  const META = { fromCache: false, hasPendingWrites: false };
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  function erro(e) {
    const code = e && (e.code || '');
    const msg = (e && e.message) || String(e);
    // 42501 = bloqueado pela segurança (RLS); PGRST301 = sessão expirada
    if (code === '42501' || code === 'PGRST301' || /row-level security|JWT/i.test(msg)) return { code: 'invalid_argument', message: msg };
    if (/fetch|network|Failed to fetch|timeout/i.test(msg)) return { code: 'unavailable', message: msg };
    return { code: 'unavailable', message: msg };
  }

  function snapColecao(col) {
    const m = cache.get(col) || new Map();
    const docs = [...m.entries()].map(([id, d]) => ({ id, exists: true, data: () => d, metadata: META }));
    return { docs, size: docs.length, empty: !docs.length, metadata: META, docChanges: () => [] };
  }
  function emitir(col) {
    const s = snapColecao(col);
    (ouvintes.get(col) || new Set()).forEach(o => { try { o.next(s); } catch (e) { console.error(e); } });
    const m = cache.get(col) || new Map();
    for (const [chave, set] of ouvintesDoc) {
      if (!chave.startsWith(col + '/')) continue;
      const id = chave.slice(col.length + 1), d = m.get(id);
      set.forEach(o => { try { o.next({ id, exists: d !== undefined, data: () => d, metadata: META }); } catch (e) { console.error(e); } });
    }
  }
  function falhar(col, e) {
    (ouvintes.get(col) || new Set()).forEach(o => o.error && o.error(e));
    for (const [chave, set] of ouvintesDoc) if (chave.startsWith(col + '/')) set.forEach(o => o.error && o.error(e));
  }

  async function lerColecao(col) {
    const m = new Map(); const passo = 1000; let de = 0;
    for (;;) {
      const { data, error } = await sb.from('docs').select('id,data').eq('colecao', col).range(de, de + passo - 1);
      if (error) throw erro(error);
      for (const r of data) m.set(r.id, r.data || {});
      if (data.length < passo) break;
      de += passo;
    }
    cache.set(col, m); carregadas.add(col); emitir(col);
  }
  function garantir(col) {
    if (carregadas.has(col)) { emitir(col); return Promise.resolve(); }
    if (!carregando.has(col)) carregando.set(col, lerColecao(col).finally(() => carregando.delete(col)));
    return carregando.get(col);
  }

  function local(col, id, data) {
    if (!cache.has(col)) cache.set(col, new Map());
    if (data === null) cache.get(col).delete(id); else cache.get(col).set(id, data);
    emitir(col);
  }
  function mesclar(base, patch) {
    const out = Object.assign({}, base);
    for (const [k, v] of Object.entries(patch)) {
      out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && base[k] && !Array.isArray(base[k])) ? mesclar(base[k], v) : v;
    }
    return out;
  }
  async function gravar(col, id, data) {
    const { error } = await sb.from('docs').upsert({ colecao: col, id, data, atualizado_em: new Date().toISOString() });
    if (error) throw erro(error);
    local(col, id, data);
  }
  async function atualizar(col, id, patch) {
    let base = (cache.get(col) || new Map()).get(id);
    if (base === undefined) {
      const { data, error } = await sb.from('docs').select('data').eq('colecao', col).eq('id', id).maybeSingle();
      if (error) throw erro(error);
      if (!data) throw { code: 'invalid_argument', message: 'Registro não encontrado.' };
      base = data.data || {};
    }
    return gravar(col, id, mesclar(base, patch));
  }
  async function excluir(col, id) {
    const { error } = await sb.from('docs').delete().eq('colecao', col).eq('id', id);
    if (error) throw erro(error);
    local(col, id, null);
  }

  function refDoc(col, id) {
    return {
      id, path: col + '/' + id,
      get: async () => { await garantir(col); const d = (cache.get(col) || new Map()).get(id); return { id, exists: d !== undefined, data: () => d, metadata: META }; },
      set: d => gravar(col, id, d),
      update: p => atualizar(col, id, p),
      delete: () => excluir(col, id),
      onSnapshot(next, error) {
        const chave = col + '/' + id, o = { next, error };
        if (!ouvintesDoc.has(chave)) ouvintesDoc.set(chave, new Set());
        ouvintesDoc.get(chave).add(o);
        garantir(col).catch(e => { error && error(e); });
        return () => ouvintesDoc.get(chave).delete(o);
      }
    };
  }
  const db = {
    collection(col) {
      return {
        path: col,
        doc: id => refDoc(col, id || novoId()),
        add: async d => { const r = refDoc(col, novoId()); await r.set(d); return r; },
        onSnapshot(next, error) {
          const o = { next, error };
          if (!ouvintes.has(col)) ouvintes.set(col, new Set());
          ouvintes.get(col).add(o);
          garantir(col).catch(e => falhar(col, e));
          return () => ouvintes.get(col).delete(o);
        }
      };
    },
    doc(path) { const [col, id] = String(path).split('/'); return refDoc(col, id); }
  };

  // Tempo real: o que a Thays lança no celular aparece no seu computador (e vice-versa)
  function iniciarTempoReal() {
    if (canal) return;
    canal = sb.channel('docs-tempo-real')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, pl => {
        const row = (pl.new && pl.new.colecao) ? pl.new : pl.old;
        if (!row || !row.colecao || !cache.has(row.colecao)) return;
        if (pl.eventType === 'DELETE') cache.get(row.colecao).delete(row.id);
        else cache.get(row.colecao).set(row.id, (pl.new && pl.new.data) || {});
        emitir(row.colecao);
      })
      .subscribe();
  }
  // Ao voltar para o app (celular), relê tudo para garantir que nada ficou para trás
  let ultimaLeitura = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - ultimaLeitura < 30000) return;
    ultimaLeitura = Date.now();
    for (const col of [...carregadas]) { carregadas.delete(col); garantir(col).catch(() => {}); }
  });

  window.Dados = {
    configurado: true, sb, db, iniciarTempoReal,
    async sessao() { const { data } = await sb.auth.getSession(); return data.session; },
    cpfParaLogin(cpf) { return String(cpf || '').replace(/\D/g, '') + '@' + (cfg.LOGIN_DOMINIO || 'thaysjesus.app'); },
    async entrar(cpf, senha) {
      const { data, error } = await sb.auth.signInWithPassword({ email: this.cpfParaLogin(cpf), password: senha });
      if (error) throw error; return data.session;
    },
    async sair() { try { await sb.auth.signOut(); } finally { location.hash = ''; location.reload(); } },
    async novaSenha(senha) { const { error } = await sb.auth.updateUser({ password: senha }); if (error) throw error; },
    async souMembro() { const { data, error } = await sb.from('membros').select('user_id').limit(1); return !error && !!data && data.length > 0; },
    aoMudarLogin(fn) { sb.auth.onAuthStateChange((evento, sessao) => fn(evento, sessao)); },
    async backup() {
      const out = {}; const passo = 1000; let de = 0;
      for (;;) {
        const { data, error } = await sb.from('docs').select('colecao,id,data,atualizado_em').range(de, de + passo - 1);
        if (error) throw erro(error);
        for (const r of data) { (out[r.colecao] = out[r.colecao] || {})[r.id] = r.data; }
        if (data.length < passo) break; de += passo;
      }
      return out;
    }
  };
})();
