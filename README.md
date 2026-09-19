# 🌾 Fazenda Pantaneiros - Sistema de Fluxo de Caixa & Metas

Sistema web para gestão financeira, fluxo de caixa em **DOLS**, controle de metas em cascata e apuração com repartição de lucros na visão do Dono.

---

## 🚀 Como Executar

### Opção 1: Clique Duplo (Windows)
Basta dar dois cliques no arquivo **`iniciar_sistema.bat`** na pasta do projeto!

### Opção 2: Pelo Terminal
```bash
npm run dev
```
O sistema abrirá automaticamente no seu navegador em **`http://localhost:3000`**.

---

## 🎯 Funcionalidades Principais

### 1. 📊 Fluxo de Caixa Diário (Moeda em DOLS)
- **Registro Rápido**: Lançamento de entradas e saídas operacionais.
- **Formato Oficial Pantaneiros**: Ao registrar, o sistema calcula o novo saldo e gera o texto idêntico ao que você já usava:
  ```
  > ADICIONADO: 18.900 DOLS NO CAIXA DA FAZENDA
  > QUEM ADICIONOU: Marcos Gerente
  > TOTAL DO CAIXA DA FAZENDA: 30.000 DOLS
  > DIA: 18/09
  ```
- **Botão Copiar com 1 Clique**: Copie a mensagem formatada para colar direto no Discord ou WhatsApp da fazenda.
- **Extrato & Filtros**: Filtre por tipo (entradas/saídas), por responsável ou busque por palavra-chave.

---

### 2. 🎯 Hierarquia de Metas em Cascata
O sistema reflete a cadeia de comando da fazenda:
- **👑 Dono &rarr; 👔 Gerente**: O Dono estipula as metas de arrecadação global para os Gerentes.
- **👔 Gerente &rarr; 🌾 Membro**: O Gerente desdobra e cria metas individuais de produção/entregas para cada vaqueiro/membro da equipe.
- **Progresso Dinâmico**: Conforme os membros adicionam DOLS no caixa, as metas ativas são atualizadas automaticamente com barras de progresso percentual e status de conclusão.

---

### 3. 👑 Visão do Dono (Repartição de Lucros)
Módulo exclusivo acessado com perfil de Dono:
- **Cálculo Automático do Lucro Líquido**:
  $$\text{Lucro Líquido Real} = \text{Receitas (Vendas)} - \text{Despesas (Insumos/Manutenção)}$$
- **Regras de Repartição Configuráveis**:
  - **% Caixa da Fazenda (Empresa)**: Retenção para reserva, novos lotes e infraestrutura.
  - **% Bônus da Gerência**: Repasse destinado aos Gerentes.
  - **% Repasse dos Membros**: Dividido proporcionalmente entre os membros de acordo com o que cada um produziu e entregou no caixa.
- **Folha de Pagamento Completa**: Tabela calculada pessoa por pessoa com o valor líquido que cada um tem a receber.
- **Exportação Formatada**: Gera o extrato de fechamento pronto para postar no Discord.
- **Fechamento de Ciclo**: Salva o histórico de fechamentos de caixa.

---

### 4. 👥 Equipe & Ranking
- Lista de todos os integrantes com fotos/avatares e cargos.
- Ranking de quem mais adicionou DOLS no caixa.
- Cadastro e gerenciamento de novos membros.

---

## 💾 Persistência dos Dados
Todos os dados são salvos localmente no navegador (LocalStorage). Você não perde os registros ao fechar a janela.
Se desejar restaurar os dados de demonstração originais, clique no botão de reset no canto superior da tela.
