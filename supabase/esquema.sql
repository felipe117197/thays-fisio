-- =====================================================================
-- esquema.sql — banco do app Thays Jesus Fisioterapia (Supabase)
-- Rode TUDO de uma vez no Supabase: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem problema (não apaga dados).
-- =====================================================================

-- 1) Lista de quem pode usar o app ----------------------------------------
create table if not exists public.membros (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  criado_em  timestamptz not null default now()
);

-- 2) Todos os registros do app --------------------------------------------
--    colecao: pacientes | sessoes | pacotes | planos | recebimentos | config
create table if not exists public.docs (
  colecao        text not null,
  id             text not null,
  data           jsonb not null default '{}'::jsonb,
  atualizado_em  timestamptz not null default now(),
  primary key (colecao, id)
);

-- 3) Função que responde "o usuário logado está na lista de membros?" -----
create or replace function public.eh_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.membros where user_id = auth.uid());
$$;
revoke all on function public.eh_membro() from public;
grant execute on function public.eh_membro() to authenticated;

-- 4) Segurança (Row Level Security) ---------------------------------------
alter table public.membros enable row level security;
alter table public.docs    enable row level security;

-- Cada membro só enxerga a própria linha em "membros" (o app usa isso para saber se foi liberado).
-- Ninguém inclui ou remove membros pelo app: isso só é feito pelo SQL Editor.
drop policy if exists membros_ver_proprio on public.membros;
create policy membros_ver_proprio on public.membros
  for select to authenticated
  using (user_id = auth.uid());

-- Só membros leem e gravam os dados.
drop policy if exists docs_membros_ler     on public.docs;
drop policy if exists docs_membros_incluir on public.docs;
drop policy if exists docs_membros_alterar on public.docs;
drop policy if exists docs_membros_excluir on public.docs;
create policy docs_membros_ler     on public.docs for select to authenticated using (public.eh_membro());
create policy docs_membros_incluir on public.docs for insert to authenticated with check (public.eh_membro());
create policy docs_membros_alterar on public.docs for update to authenticated using (public.eh_membro()) with check (public.eh_membro());
create policy docs_membros_excluir on public.docs for delete to authenticated using (public.eh_membro());

-- Visitantes sem login (chave anon) não têm acesso a nada.
revoke all on public.docs, public.membros from anon;
grant select, insert, update, delete on public.docs to authenticated;
grant select on public.membros to authenticated;

-- 5) Tempo real (o que um lança aparece no aparelho do outro) -------------
alter table public.docs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs'
  ) then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;


-- =====================================================================
-- COMANDOS DE ADMINISTRAÇÃO (não rode junto com o resto; copie só o que precisar)
-- Troque os CPFs pelos reais, só números.
-- =====================================================================

-- LIBERAR um usuário (depois de criá-lo em Authentication > Users):
-- insert into public.membros (user_id, nome)
-- select id, 'Nome da pessoa' from auth.users where email = '12345678901@thaysjesus.app'
-- on conflict (user_id) do nothing;

-- ESQUECEU A SENHA: define uma senha nova (a pessoa troca depois em Ajustes > Minha conta):
-- update auth.users
--    set encrypted_password = extensions.crypt('NovaSenha123', extensions.gen_salt('bf')),
--        updated_at = now()
--  where email = '12345678901@thaysjesus.app';

-- BLOQUEAR um acesso na hora (o login continua existindo, mas não vê mais nada):
-- delete from public.membros
--  where user_id = (select id from auth.users where email = '12345678901@thaysjesus.app');

-- VER quem está liberado:
-- select m.nome, u.email, m.criado_em from public.membros m join auth.users u on u.id = m.user_id;
