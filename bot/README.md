# 🤠 Bot Interativo Discord - Fazenda Pantaneiros

Bot oficial interativo para gestão de **Rotas de Entrega & Cargas** com botões nativos no Discord sincronizados em tempo real com o site e o Supabase.

---

## 🚀 Como Colocar o Bot Online (Passo a Passo)

### 1. Criar a Aplicação no Discord Developer Portal
1. Acesse o portal de desenvolvedores do Discord:
   👉 **[https://discord.com/developers/applications](https://discord.com/developers/applications)**
2. Faça login com a sua conta do Discord.
3. No canto superior direito, clique no botão azul **"New Application"**.
4. Dê o nome: `Pantaneiros Bot` (ou o nome que preferir) e clique em **Create**.

---

### 2. Pegar o Token do Bot
1. No menu lateral esquerdo, clique em **"Bot"**.
2. Clique no botão **"Reset Token"** (ou "Add Bot" se solicitado).
3. Confirme e **copie o Token** gerado (parece uma chave longa cheia de letras e números).
   * ⚠️ *Guarde este token com segurança e nunca compartilhe publicamente.*
4. Role um pouco a página para baixo até a seção **"Privileged Gateway Intents"**:
   * Marque a opção: **MESSAGE CONTENT INTENT** (Azul/Ativado)
   * Marque a opção: **SERVER MEMBERS INTENT** (Azul/Ativado)
5. Clique em **"Save Changes"** (Salvar Alterações) no botão verde que aparece embaixo.

---

### 3. Pegar o Client ID (Application ID)
1. No menu lateral esquerdo, clique em **"General Information"**.
2. Onde diz **"Application ID"**, clique em **Copy**.

---

### 4. Convidar o Bot para o seu Servidor Discord
1. No menu lateral esquerdo, vá em **OAuth2** -> **URL Generator**.
2. Em **SCOPES**, marque:
   * `bot`
   * `applications.commands`
3. Em **BOT PERMISSIONS** (que aparece embaixo), marque:
   * `Send Messages`
   * `Embed Links`
   * `Attach Files`
   * `Read Message History`
   * `Use Slash Commands`
4. No final da página, copie a URL gerada em **"Generated URL"**.
5. Abra essa URL no seu navegador, selecione o seu servidor do Discord e clique em **Autorizar**.
   * Pronto! O bot agora está dentro do seu servidor!

---

### 5. Configurar o Arquivo `.env` do Bot
No seu computador ou servidor, dentro da pasta `bot/`:
1. Copie o arquivo `.env.example` para `.env`:
2. Abra o arquivo `.env` e preencha:
```env
DISCORD_BOT_TOKEN=cole_seu_token_aqui
DISCORD_CLIENT_ID=cole_seu_client_id_aqui
```
*(O Supabase e o link do site já vêm pré-configurados!)*

---

### 6. Ligar o Bot
Abra o terminal no projeto e execute:
```bash
npm run bot
```
Ou dentro da pasta `bot`:
```bash
cd bot
npm start
```

Você verá a mensagem:
```
🤠 Bot Pantaneiros conectado como: Pantaneiros Bot#1234
🌐 Painel Web integrado: https://fazenda-pantaneiros.onrender.com
```

---

## 🎮 Como Usar no Discord

No canal onde você quer gerenciar as rotas:
* Digite `/rotas` ou o comando rápido `!rotas`
* O bot enviará o **Painel Interativo de Rotas e Missões**:
  1. **Menu Suspenso**: Permite trocar entre as rotas (Fazendeiros, Ferrovia, Taverna).
  2. **Barra de Progresso**: Mostra `[████████░░] 80%` em tempo real.
  3. **Botões Rápidos**: Adicione cargas com 1 clique (ex: `+50 Leite`, `+15 Café`).
  4. **Botão de Entrega**: Ao atingir 100%, clique em `✅ Entregar & Creditar` para somar a recompensa em dinheiro diretamente no caixa da empresa no site!
  5. **Botão de Link**: Leva direto para o painel web no navegador.
