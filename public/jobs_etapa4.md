# Documentação Técnica de Jobs e Agendamentos Cron — Workstation CCO Guarabira

## 1. Visão Geral
A Workstation CCO do Armazém Ambev Guarabira utiliza jobs agendados via sintaxe standard Cron para automação de rotinas de auditoria, reclassificação de prazos críticos de vencimento e saneamento de dados operacionais.

---

## 2. Matriz de Jobs e Expressões Cron

| Nome do Job | Expressão Cron | Frequência | Descrição Técnica & Objetivo | Tabela Afetada |
|---|---|---|---|---|
| **`job_45dias`** | `0 1 * * *` | Diariamente às 01:00 AM | **Rotina de Validade Crítica**: Percorre todos os itens de demanda e atualiza a flag `prazo_45dias_flag = true` para lotes com vencimento $\le 45$ dias. Re-calcula os dias de estoque e atualiza o farol de recolhimento no painel CCO. | `demand_items`, `notifications` |
| **`job_reset_5s_diario`** | `0 5 * * *` | Diariamente às 05:00 AM | **Reset de Início de Turno 5S**: Reseta os status de aprovação de jornada dos colaboradores e exige o preenchimento do checklist 5S antes dos registros no pátio. | `checklists`, `colaboradores` |
| **`job_recalculo_stock_age`** | `0 2 * * *` | Diariamente às 02:00 AM | **Recálculo do Stock Age Index**: Aplica a fórmula $SAI = \frac{\text{Dias Restantes}}{\text{Shelf Life Total}}$ para todos os SKUs Ambev e destaca itens com $SAI < 0.60$. | `demand_items`, `products` |
| **`job_saneamento_ocr_uploads`** | `0 3 * * 0` | Domingos às 03:00 AM | **Expurgo de Mídia Temporária**: Apaga arquivos de imagem de notas e caixas processadas pelo OCR no pátio há mais de 30 dias para otimização de armazenamento. | `uploads` |
| **`job_notificacoes_pendencias_5whys`** | `0 8 * * 1-6` | Segunda a Sábado às 08:00 AM | **Alertas de Planos de Ação**: Emite notificações de cobrança para responsáveis por Planos de Ação dos 5 Porquês com prazos prestes a vencer. | `acoes`, `notifications` |

---

## 3. Detalhamento Técnico dos Jobs Críticos

### 3.1. Job `job_45dias` (Recálculo de Janela Crítica de Recolhimento)
- **Agendamento**: `0 1 * * *` (Todos os dias à 01:00 AM)
- **Lógica de Execução**:
  1. Seleciona `SELECT * FROM demand_items WHERE data_vencimento - CURRENT_DATE <= 45`.
  2. Atualiza `prazo_45dias_flag = true` e `destino_workstation = 'Gestão de Escoamento'`.
  3. Dispara uma notificação para a role `Conferente` e `Administrativo` listando a quantidade de novos itens retidos.
  4. Registra o evento na tabela `jobs`.

### 3.2. Job `job_reset_5s_diario` (Bloqueio de Início de Jornada)
- **Agendamento**: `0 5 * * *` (Todos os dias às 05:00 AM)
- **Lógica de Execução**:
  1. Altera o estado da flag de jornada dos colaboradores ativos para `jornada_iniciada = false`.
  2. Força a exibição do modal bloqueante de 5S no próximo login ou interação na workstation.
