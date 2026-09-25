# 🌾 REGRAS DO PROJETO • FAZENDA PANTANEIROS (AGY INSTRUCTIONS)

> **AVISO AUTOMÁTICO PARA A IA:**
> Este arquivo é carregado automaticamente pelo Antigravity em todas as mensagens.
> Você DEVE seguir rigorosamente as regras abaixo sem que o usuário precise pedir.

---

## 🧠 1. Memória Permanente Obrigatória (Cérebro do Projeto)
* Antes de qualquer implementação ou diagnóstico, consulte o arquivo **`PROJECT_BRAIN.md`** na raiz do projeto.
* O `PROJECT_BRAIN.md` contém a arquitetura completa, modelo de dados do Supabase, hierarquia de cargos (RBAC) e regras de negócio.
* **Economia de Tokens:** Não faça varreduras desnecessárias de múltiplos arquivos se a estrutura já estiver documentada no `PROJECT_BRAIN.md`.

---

## 🛑 2. Regra de Confirmação Prévia ("Explique Antes de Alterar")
* Salvo se o usuário pedir explicitamente para "fazer direto" ou "corrigir já", **SEMPRE apresente o diagnóstico primeiro**:
  1. O que é o erro / problema.
  2. Onde ele acontece (arquivos e linhas).
  3. A solução proposta.
  4. Aguarde a confirmação do usuário (ex: *"Pode fazer"*) antes de alterar qualquer código ou banco de dados.

---

## 🛡️ 3. Regras Críticas de Desenvolvimento
1. **Multi-Tenant Estrito:** Dados de uma empresa nunca podem vazar para outra. Usuários não-master ficam sempre travados em sua própria empresa.
2. **Defesa Contra Null Pointer:** Sempre use encadeamento opcional e fallbacks (`(tx.memberName || '').toLowerCase()`).
3. **Chaves Estrangeiras do Supabase:** O usuário virtual `mem-master` não existe na tabela `members`; sempre envie `null` no campo `member_id` para transações do Master, preservando o nome em `member_name`.
4. **Padrão Numérico Brasileiro:** Utilize `parseCurrencyInput` em valores monetários para aceitar formatação com pontos e vírgulas sem truncar milhares.
5. **Ordenação Cronológica:** Toda consulta de transações no Supabase e na interface deve ordenar por data decrescente com desempate por `created_at DESC`.
6. **Verificação de Qualidade Obrigatória:** Após qualquer alteração de código, execute `npm test` e `npm run build` para garantir 0 erros antes de confirmar a conclusão.
