# Backlog Priorizado de Desenvolvimento por Sprints — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Estratégia de Entregas**: Sprints Quinzenais (Sprint 1 a Sprint 4 — MVP até Produção Completa)  

---

## 1. Visão Geral das Sprints

| Sprint | Foco Principal | Entregáveis Chave | Estimativa Esforço |
|---|---|---|---|
| **Sprint 1 (MVP)** | Autenticação, Cadastro e Dashboard Workstation | Login JWT, Matriz Acesso, KPI Cards, Tabela Validades | Alta |
| **Sprint 2** | Motor FEFO, Validades 45D e Calculadora ABC | Job 45d, Stock Age Index, Curva ABC/Pareto, Filtro Unidades | Média |
| **Sprint 3** | Notificações, Triggers, Checklists 5S e Diário | Push WebSocket, Email SMTP, Modal 5S Bloqueante, Audit Logs | Média |
| **Sprint 4** | Importadores, Pacote Prejuízo e Homologação | Staging CSV/XLSX, Report de Erros, Encerramento 5 Whys, Homologação DPO | Média |

---

## 2. Detalhamento de Tarefas por Sprint e Módulos

### Sprint 1: MVP Core Architecture & Workstation Layout
- **[FRONTEND] UI-01**: Layout responsivo do Painel CCO com alternância de unidades (cx, hl, R$) e período (hoje, 7d, mês, ano). *(Estimativa: Alta | Dep: Nenhuma)*
- **[BACKEND] API-01**: Implementação do endpoint `POST /auth/login` com emissão de token JWT e controle por matrícula. *(Estimativa: Média | Dep: Nenhuma)*
- **[BACKEND] API-02**: Endpoint `GET /workstation` e `POST /users` com auto-provisionamento de permissões (`assign_default_roles_on_create`). *(Estimativa: Média | Dep: API-01)*
- **[DATABASE] DB-01**: Modelagem e migration do PostgreSQL para tabelas `colaboradores`, `products`, `demand_items` e `logins`. *(Estimativa: Alta | Dep: Nenhuma)*

### Sprint 2: Algoritmos de Validade, Stock Age & Curva ABC
- **[BACKEND] JOB-01**: Implementação do Cron `job_45dias` (`0 1 * * *`) para reclassificação automática de lotes críticos. *(Estimativa: Média | Dep: DB-01)*
- **[BACKEND] CALC-01**: Implementação da rotina de cálculo de `dias_estoque`, `stock_age_index` e `previsao_escoamento`. *(Estimativa: Média | Dep: JOB-01)*
- **[FRONTEND] UI-02**: Tabela dinâmica de Curva ABC / Pareto com exportação para CSV. *(Estimativa: Média | Dep: CALC-01)*

### Sprint 3: Rituais DPO, Checklists 5S e Triggers de Notificação
- **[BACKEND] TRIG-01**: Motor de notificações para alertas `item_45dias`, `stock_age_alert` e auto-presença em reuniões. *(Estimativa: Média | Dep: JOB-01)*
- **[FRONTEND] UI-03**: Modal bloqueante de Checklist 5S de Início de Jornada com validação no login. *(Estimativa: Média | Dep: API-02)*
- **[BACKEND] API-03**: Endpoint `PATCH /demandas/:id/atualizar-quantidade` com trava de dias úteis (Seg-Sáb) e audit trail. *(Estimativa: Média | Dep: DB-01)*

### Sprint 4: Importação Staging, Pacote Prejuízo SCL e Encerramento 5 Porquês
- **[BACKEND] STAG-01**: Motor de importação CSV com trava de rejeição de lote se erros $> 10$ e geração do relatório markdown. *(Estimativa: Alta | Dep: DB-01)*
- **[FRONTEND] UI-04**: Painel do Pacote Prejuízo (SCL 15 KPIs) com relatório Waterfall. *(Estimativa: Média | Dep: API-03)*
- **[QA / PROD] QA-01**: Execução do plano de testes de aceite e deploy no Cloud Run. *(Estimativa: Média | Dep: Todas)*
