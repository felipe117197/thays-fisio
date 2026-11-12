# Thays Jesus Fisioterapia — como colocar no ar

O app tem duas partes:

| Parte | Onde fica | Para que serve |
|---|---|---|
| **App** (telas) | **GitHub Pages** | É o endereço que abre no celular e no computador |
| **Dados + login** | **Supabase** | Guarda pacientes, agenda e financeiro e confere CPF e senha |

Os dois têm plano gratuito. Tempo total: cerca de 30 minutos.

---

## Passo 1 — Criar o banco no Supabase

1. Entre em **supabase.com** e crie uma conta (pode usar a conta do GitHub).
2. Clique em **New project**:
   - **Name:** `thays-fisio`
   - **Database password:** crie uma senha forte e **guarde**. É a senha do banco, não a do app.
   - **Region:** **South America (São Paulo)**. Assim os dados dos pacientes ficam no Brasil.
3. Espere o projeto ficar pronto (1 a 2 minutos).
4. No menu lateral, abra **SQL Editor** → **New query**. Abra o arquivo `supabase/esquema.sql`, copie **tudo**, cole e clique em **Run**. Deve aparecer "Success".

## Passo 2 — Ligar o app ao banco (`config.js`)

1. No Supabase, abra **Project Settings → API** (em algumas versões, **Data API** ou **API Keys**).
2. Copie:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - a chave **anon public** (ou **publishable**)
3. Abra o arquivo `config.js` no Bloco de Notas e substitua:
   - `COLE_AQUI_A_PROJECT_URL` pela Project URL
   - `COLE_AQUI_A_CHAVE_ANON` pela chave anon
4. Salve.

> **Nunca** use a chave `service_role` no `config.js`. A chave anon pode ficar visível, porque quem protege os dados é o login junto com as regras criadas no passo 1.

## Passo 3 — Criar os logins (CPF e senha)

O Supabase exige um "e-mail" como usuário. Por isso o app transforma o CPF em `CPF@thaysjesus.app`. Não é um e-mail de verdade e nada é enviado para ele.

1. No Supabase, abra **Authentication → Users → Add user → Create new user**.
2. Para a **Thays**:
   - **Email:** o CPF dela **só com números**, seguido de `@thaysjesus.app`. Exemplo: `12345678901@thaysjesus.app`
   - **Password:** a senha dela, com no mínimo 8 caracteres, misturando letras e números.
   - Marque **Auto Confirm User**.
3. Repita para **você**, com o seu CPF.
4. **Desative novos cadastros:** em **Authentication → Sign In / Providers** (ou **Settings**), desligue **Allow new users to sign up**.

## Passo 4 — Liberar os dois usuários

No **SQL Editor**, rode (trocando pelos CPFs, só números):

```sql
insert into public.membros (user_id, nome)
select id, 'Thays Jesus' from auth.users where email = 'CPF_DA_THAYS@thaysjesus.app'
on conflict (user_id) do nothing;

insert into public.membros (user_id, nome)
select id, 'Administrador' from auth.users where email = 'SEU_CPF@thaysjesus.app'
on conflict (user_id) do nothing;
```

Só quem está nessa lista vê ou lança dados. Mesmo que alguém descubra um login, sem estar aqui não acessa nada.

## Passo 5 — Publicar no GitHub Pages

1. Entre em **github.com** e crie uma conta.
2. Clique em **+ → New repository**:
   - **Repository name:** `thays-fisio`
   - **Public** (no plano gratuito, o GitHub Pages só funciona com repositório público. O código fica visível, mas **nenhum dado de paciente** fica no GitHub)
   - Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste **todos os arquivos e a pasta `icons`**: `index.html`, `config.js` (já preenchido), `dados.js`, `sw.js`, `manifest.webmanifest`, `LEIA-ME.md` e a pasta `icons`. A pasta `supabase` é opcional.
5. Clique em **Commit changes**.
6. Vá em **Settings → Pages**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `(root)` → **Save**
7. Em 1 a 2 minutos aparece o endereço: **`https://SEU-USUARIO.github.io/thays-fisio/`**

## Passo 6 — Instalar no celular

**Android (Chrome):** abra o endereço → menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**).

**iPhone (Safari):** abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**.

O ícone da logomarca aparece na tela, e o app abre em tela cheia, sem a barra do navegador. Na primeira vez, entre com **CPF e senha**. O login fica salvo no aparelho até alguém tocar em **Sair** (em Ajustes).

---

## Dia a dia

| Situação | O que fazer |
|---|---|
| Trocar a própria senha | No app: **Ajustes → Minha conta → Trocar senha** |
| Alguém esqueceu a senha | O administrador roda no SQL Editor o comando "ESQUECEU A SENHA" do final do `esquema.sql` |
| Bloquear um acesso | SQL Editor → comando "BLOQUEAR" do final do `esquema.sql` |
| Backup | **Ajustes → Baixar backup**, **toda semana**. Guarde o arquivo num lugar seguro |
| Publicar uma atualização do app | No GitHub, envie o arquivo novo (**Add file → Upload files**) e troque `v1` por `v2` na 1ª linha de código do `sw.js` |

## Limites do plano gratuito (importante)

- **Supabase pausa projetos parados por 7 dias.** Com uso diário isso não acontece. Se pausar, entre no supabase.com e clique em **Restore**: os dados não se perdem.
- **Supabase gratuito não faz backup automático.** Por isso o botão **Baixar backup** existe: use toda semana.
- O banco gratuito tem **500 MB**, o que dá muitos anos de agenda de um consultório.

## Segurança e LGPD

- Use senhas fortes e não compartilhe.
- Os dados dos pacientes são dados de saúde (sensíveis na LGPD). Guarde no app só o necessário para agenda e cobrança. A evolução clínica fica no prontuário.
- Se trocar de celular ou perdê-lo: troque a senha. Se precisar cortar o acesso na hora, use o comando BLOQUEAR.
