# Backlog de Desenvolvimento e Plano de Sprints — Etapa 6 (DPO Guarabira-PB)

Este documento apresenta o planejamento incremental de entregas, organizado em Sprints do MVP até a versão completa do sistema logístico de armazém, incorporando o **Sprint TAPA X (Cadastros & Controle de Acessos)**, estratégias de Feature Toggles, Rollout e Rollback.

---

## 1. Visão Geral do Roadmap de Sprints

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SPRINT 1: MVP Core Base & Autenticação (Login, Validação 45D e CCO Base)        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 2: TAPA X — Cadastros Master & Controle de Acessos RBAC                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 3: Workstation Pátio, Future Shelf & Edição Mon–Sáb por Conferente        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 4: Operação do Ajudante, Modal Checklist 5S e Trava de Jornada           │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 5: Gestão de Escoamento, Stock Age Index (<60) e Notificações            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPRINT 6: Produtividade 13 Operações, Governança DPO, Rollout e Suporte          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento dos Sprints

### 🚀 SPRINT 1 — MVP Core Base & Infraestrutura
- **Objetivo**: Estabelecer a arquitetura do projeto, autenticação com JWT, ingestão de dados da Etapa 2 e visualização da Visão Geral com alerta de 45 dias.
- **Tarefas**:
  - **Backend**: Implementar `POST /auth/login`, conexão com banco relacional/Firestore, inicialização das tabelas `colaboradores` e `demand_items`. (*Complexidade: Média*)
  - **Frontend**: Criar telas de Login, Visão Geral com cartões de valoração total em risco e tabela de itens críticos (≤ 45 Dias). (*Complexidade: Média*)
  - **Infra**: Configurar servidor Express + Vite na porta 3000 em Cloud Run / Container. (*Complexidade: Baixa*)
  - **QA**: Testes unitários do cálculo de dias restantes ($vencimento - hoje \le 45$). (*Complexidade: Baixa*)
- **Dependências**: Nenhuma.
- **Critérios de Aceite**:
  1. Usuário realiza login com matrícula/senha e recebe JWT válido.
  2. Rota `/overview` renderiza os 10 itens processados na Etapa 2 com status de risco correto.
  3. Lotes com vencimento $\le 45$ dias exibem badge vermelho de alta prioridade.

---

### 🛡️ SPRINT 2 — TAPA X: Cadastros Master & Controle de Acessos
- **Objetivo**: Garantir a governança de dados mestres (`colaboradores`, `produtos`, `logins`) e provisionamento automático de permissões por perfil.
- **Tarefas**:
  - **Backend**:
    - Implementar `POST /users` com gatilho `assign_default_roles_on_create`.
    - Implementar `POST /access-control` para override manual e log de auditoria.
    - Implementar verificação imediata de status `ativo/inativo` nos middlewares REST. (*Complexidade: Alta*)
  - **Frontend**:
    - Tela de Cadastros (Colaboradores, Produtos, Lotes).
    - Painel de Controle de Acessos com matriz de perfis (Ajudante, Operador Empilhadeira, Conferente, Administrativo) e toggle de override manual. (*Complexidade: Média*)
  - **QA**: Testar criação de colaborador com papéis herdados e inativação imediata de sessão de usuário inativado. (*Complexidade: Média*)
- **Dependências**: Sprint 1.
- **Critérios de Aceite**:
  1. Ao cadastrar colaborador com perfil "Conferente", o sistema atribui automaticamente as permissões `write:future_shelf_qty` e `write:escoamento_registro`.
  2. Inativar um usuário via API ou UI revoga imediatamente o token e bloqueia requisições ativas.
  3. Painel de Controle de Acessos permite override manual com gravação de justificativa e log de auditoria.

---

### 📦 SPRINT 3 — Workstation Pátio, Future Shelf & Edição Mon–Sáb
- **Objetivo**: Disponibilizar o painel Future Shelf com atualização de saldo físico contado por conferentes com trava de dia útil (Segunda a Sábado).
- **Tarefas**:
  - **Backend**: Endpoint `PATCH /demandas/:id/atualizar-quantidade` com validação estrita de perfil `Conferente` e dia da semana (Mon–Sat). (*Complexidade: Média*)
  - **Frontend**: Componente `FutureShelfTable` com input inline de quantidade para conferente, exibição de $venda\_media$, $dias\_estoque$ e $stock\_age\_index$. (*Complexidade: Média*)
  - **QA**: Validar tentativa de edição por ajudante (bloqueada) e edição em Domingo (bloqueada). (*Complexidade: Média*)
- **Dependências**: Sprint 2.
- **Critérios de Aceite**:
  1. Apenas usuários com perfil ou permissão de Conferente conseguem salvar alterações de quantidade.
  2. Sistema impede edições no Domingo, retornando erro descritivo "Edição permitida apenas de Segunda a Sábado".
  3. Histórico grava nome do conferente e timestamp da última aferição no pátio.

---

### 👷 SPRINT 4 — Operação do Ajudante, Modal Checklist 5S & Trava de Jornada
- **Objetivo**: Implementar o rito obrigatório de início de jornada do ajudante via checklist 5S com bloqueio operacional até a submissão.
- **Tarefas**:
  - **Backend**: Implementar `POST /checklists/submit` e status de jornada do colaborador. (*Complexidade: Média*)
  - **Frontend**: Componente `ChecklistModal5S` disparado pelo evento 'Iniciar Jornada' usando template `5s_ajudante_armazem_v1.json`. (*Complexidade: Média*)
  - **QA**: Garantir que atalhos de navegação e APIs operacionais fiquem inacessíveis para o Ajudante até o envio completo dos 5 itens obrigatórios. (*Complexidade: Média*)
- **Dependências**: Sprint 2.
- **Critérios de Aceite**:
  1. Botão 'Iniciar Jornada' abre modal com os 5 itens do checklist 5S.
  2. Tentativa de fechar o modal ou usar o sistema sem responder resulta em bloqueio com aviso em tela.
  3. Após envio com todos os itens confirmados, o status é alterado para `liberado_para_operacao`.

---

### 📈 SPRINT 5 — Gestão de Escoamento, Stock Age Index (<60) & Notificações
- **Objetivo**: Ativar os motores de cálculo de envelhecimento de estoque, plano de giro promocional e central de notificações recorrentes.
- **Tarefas**:
  - **Backend**:
    - Mapear cron tasks (`job_45dias`, `job_stock_age_index`).
    - Endpoint `POST /escoamento` para baixar quantidade e recalcular previsão. (*Complexidade: Alta*)
  - **Frontend**:
    - View Gestão de Escoamento com filtro automático para $Stock\ Age\ Index < 0.60$.
    - Botão 'Registrar Escoamento' e central de alertas em tempo real. (*Complexidade: Média*)
  - **QA**: Simulação dos 4 cenários de teste da Etapa 5. (*Complexidade: Média*)
- **Dependências**: Sprint 3.
- **Critérios de Aceite**:
  1. Lotes com $stock\_age\_index < 0.60$ são marcados automaticamente e notificados na Gestão de Escoamento.
  2. Clique em 'Registrar Escoamento' abre modal, consome saldo e recalcula a nova data prevista de término do lote.

---

### 📊 SPRINT 6 — Produtividade 13 Operações, Governança DPO, Rollout & Fechamento
- **Objetivo**: Integrar a matriz executiva de metas vs. reais para as 13 operações, fluxo de fechamento de ações DPO e plano de implantação em produção.
- **Tarefas**:
  - **Backend**: Endpoint `POST /acoes/:id/fechar` com recálculo automático de $percent\_closed$ global. (*Complexidade: Média*)
  - **Frontend**:
    - Tabela Consolidada das 13 Operações no RankingModule.
    - Modal de drilldown por colaborador (Repack, Despejo, Quebras).
    - Desvios & Ações com indicador de resolutividade. (*Complexidade: Média*)
  - **Infra/Rollout**: Configuração de Feature Toggles (`ENABLE_CHECKLIST_BLOCK`, `ENABLE_AUTO_ESCOAMENTO_ALERT`). (*Complexidade: Baixa*)
  - **QA**: Teste E2E da jornada completa do usuário. (*Complexidade: Alta*)
- **Dependências**: Sprints 1 a 5.
- **Critérios de Aceite**:
  1. Matriz de produtividade exibe dados em tempo real das 13 frentes operacionais de Guarabira.
  2. Ao fechar uma ação DPO, o indicador $percent\_closed$ é atualizado instantaneamente na tela.
  3. Feature toggles permitem ativar/desativar módulos em produção sem downtime.

---

## 3. Plano de Rollout, Feature Toggles e Rollback

### A. Estratégia de Rollout (Fases de Lançamento)
1. **Fase 1 — Canary / Piloto (Semana 1)**: Liberação do sistema para o time de Conferentes e Mesa de Controle de Guarabira (Turno A).
2. **Fase 2 — Operação Campo (Semana 2)**: Ativação dos Ajudantes de Armazém com o Modal Checklist 5S e Operadores de Empilhadeira.
3. **Fase 3 — Rollout Geral (Semana 3)**: Ativação para toda a equipe, reuniões de DPO, pauta de governança e relatórios executivos.

### B. Feature Toggles
| Key Toggle | Padrão | Descrição |
| :--- | :--- | :--- |
| `FEATURE_CHECKLIST_BLOCKING` | `true` | Bloqueia a navegação do ajudante até responder o checklist 5S. |
| `FEATURE_CONFERENTE_MON_SAT_ONLY` | `true` | Aplica a trava de edição de quantidade contada apenas de Mon–Sat. |
| `FEATURE_STOCK_AGE_ALERT` | `true` | Ativa alertas automáticos para SKUs com Stock Age Index < 0.60. |

### C. Plano de Rollback
- **Gatilho de Rollback**: Taxa de erros de API $> 2\%$ por mais de 5 minutos ou indisponibilidade total de salvamento de contagem no pátio.
- **Procedimento**:
  1. Desativar a flag da funcionalidade afetada via painel de Controle de Acessos sem derrubar o container.
  2. Em caso de falha crítica na base de dados, restaurar o snapshot do banco relacional anterior à janela de implantação.
  3. Notificar o CCO e retornar a operação para o modo de contingência em Diário de Bordo manual até a aplicação da correção Hotfix.
