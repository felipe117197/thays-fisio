# Aplicativo nas lojas (Google Play e App Store)

O site virou aplicativo com o **Capacitor**: os mesmos arquivos (`index.html`, `config.js`, `dados.js`...) vão
dentro de um app Android (`android/`) e de um app iOS (`ios/`). Login e dados continuam no Supabase.

- Identificador do app: `br.com.controlefisio.app` (não pode mudar depois de publicado)
- Nome na tela do celular: **Thays Fisio**
- Ícones e tela de abertura: gerados a partir de `assets/` (`npx capacitor-assets generate --android --ios`)

## Build automática (GitHub Actions)

A cada envio para `main` (ou em todo PR), o workflow **Gerar aplicativo** cria:

| Arquivo | Para que serve |
|---|---|
| `android-apk-para-testar` | Instalar direto num Android para testar |
| `android-aab-play-store` | Enviar para a Google Play (precisa da chave de assinatura nos Secrets) |
| iOS | Confere se o projeto compila; com a conta Apple pronta, envia ao TestFlight (rodar manualmente com "Enviar a versão iOS para o TestFlight") |

O número da versão sobe sozinho a cada build.

### Secrets necessários (Settings > Secrets and variables > Actions)

Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
**Guarde a chave (`upload.jks`) e as senhas num lugar seguro.**

iOS (depois da conta Apple Developer): `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`
(chave da API do App Store Connect com papel *App Manager* ou *Admin*).

## Depois de mudar o site

Para o app instalado receber a mudança, é preciso gerar uma nova versão e enviá-la às lojas
(o site no navegador continua atualizando sozinho como antes).

## Para mexer no computador (opcional)

```
npm install
npm run android   # abre no Android Studio
npm run ios       # abre no Xcode (só no Mac)
```
