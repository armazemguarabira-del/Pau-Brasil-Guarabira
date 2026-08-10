# Resumo Técnico — Etapa 3: Wireframes UI Padronizados e Header Comum

## 1. Arquitetura de Interface & Header Comum Padronizado

A interface da **Workstation CCO do Armazém Ambev Guarabira** foi padronizada com um Header Comum responsivo que se reflete em todas as 11 telas do sistema.

### Componentes do Header Comum:
- **Título & Identificação CCO**: Exibição do status operacional em tempo real (`CCO Ativo - Status OK`).
- **Toggle de Unidade Global (`cx` / `hl`)**: Comutador rápido de Caixas (cx) para Hectolitros (HL), aplicando os fatores de conversão dos SKUs e recalculando tabelas e KPIs instantaneamente.
- **Filtros Calendarizados**: Seleção rápida entre períodos `Diário`, `Semanal`, `Mensal` e `Personalizado`.
- **Botão Iniciar Jornada (Auditoria 5S)**: Dispara o modal obrigatório de checklist 5S antes do início dos registros operacionais.

---

## 2. Estrutura de Telas & Wireframes (11 Views)

1. **Visão Geral (`/overview`)**: KPI cards de alto nível, tabela de itens críticos com vencimento $\le 45$ dias e Matriz das 13 Operações.
2. **Desvios & Ações (`/desvios`)**: Tabela de desvios identificados via visão computacional, formulário de 5 Porquês e linha do tempo de resolução.
3. **Agenda Executiva (`/agenda`)**: Calendário interativo de auditorias DPO, pauta matinal e rotinas operacionais.
4. **Diário de Bordo (`/diario`)**: Passagem de turno, registro de avarias/quebras e mural de ocorrências diárias.
5. **Fluxograma de Demandas (`/fluxograma`)**: Quadro Kanban interativo com colunas de estado (*Entrada, Triagem, Em Ação, Concluído*).
6. **Reuniões & Treinamentos (`/reunioes`)**: Biblioteca de POPs DPO, lista de presença digital e ata de reuniões matinais.
7. **Produtividade (`/produtividade`)**: Ranking de operadores (Repack, Despejo, Quebras), cronômetro de Repack e modal drilldown por colaborador.
8. **Gestão de Escoamento (`/escoamento`)**: Tabela FEFO com cálculo de dias de estoque, curva Stock Age Index e modal de registro de saídas.
9. **Future Shelf / Conferente (`/future-shelf`)**: Painel de conferência com edição de quantidade física pelo conferente e liberação de saldo.
10. **Cadastros (`/cadastros`)**: Cadastro mestre de SKUs Ambev, fatores Hectolitro/cx, preços unitários e lotes.
11. **Controle de Acessos (`/acessos`)**: Matriz de perfis (Ajudante, Operador Empilhadeira, Conferente, Administrativo) e auditoria de override manual.

---

## 3. Matriz de Permissões e Perfis Operacionais

| Perfil | Visão Geral | Desvios | Agenda | Diário | Fluxograma | Reuniões | Produtividade | Escoamento | Future Shelf | Cadastros | Acessos |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ajudante** | Visualiza | - | - | Registra | - | - | Visualiza | - | - | - | - |
| **Operador Empilhadeira** | Visualiza | - | - | Registra | - | - | Registra | - | - | - | - |
| **Conferente** | Visualiza | Registra | - | Edita | Edita | Visualiza | Edita | Registra | Edita Qtd | - | - |
| **Administrativo** | Total | Total | Total | Total | Total | Total | Total | Total | Total | Total | Total |
