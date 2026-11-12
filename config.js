/* =========================================================
   CONFIGURAÇÃO — preencha com os dados do SEU projeto Supabase
   Onde encontrar: Supabase > Project Settings > API (ou "Data API")
   - Project URL  -> SUPABASE_URL
   - anon public  -> SUPABASE_ANON_KEY
   A chave "anon" é pública por natureza (fica visível no navegador).
   A proteção dos dados vem do login + regras do banco (esquema.sql).
   NUNCA coloque aqui a chave "service_role".
   ========================================================= */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://jaxeybjafnikqmzdfedw.supabase.co',        // ex.: https://abcdefghijk.supabase.co
  SUPABASE_ANON_KEY: 'sb_publishable_cZzH25S5sswDJ4frI7ENyA_TjHOZuiw',    // começa com eyJ... ou sb_publishable_...
  // Domínio interno usado para transformar CPF em usuário do Supabase.
  // Não é um e-mail de verdade. Use o mesmo valor ao criar os usuários (passo 3 do LEIA-ME).
  LOGIN_DOMINIO: 'thaysjesus.app'
};
