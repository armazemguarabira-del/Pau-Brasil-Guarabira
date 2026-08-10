# Documentação Técnica de Triggers, Notificações e Agendamentos Cron (Etapa 6) — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Unidade Operacional**: Armazém Ambev Guarabira (GBR)  
**Módulo**: CCO Workstation — Motor de Notificações, Triggers e Testes Simulados  

---

## 1. Visão Geral do Sistema de Triggers e Notificações

O subsistema de eventos do CCO Armazém Guarabira opera em tempo real para conectar o monitoramento de validade no pátio, a auditoria de Stock Age Index e os rituais operacionais DPO (Team Room e Reuniões de Passagem de Turno).

As notificações utilizam arquitetura híbrida (**Event-Driven** + **Cron Jobs**) com entregas via **In-App Push (WebSocket/HTTP)** e **Email SMTP (SendGrid/Relay Ambev)**.

---

## 2. Matriz Completa de Triggers e Notificações

| ID Trigger | Nome do Evento | Condição de Disparo | Destinatários | Canais | Expressão Cron / Frequência | Policy Retry |
|---|---|---|---|---|---|---|
| **`trig_01`** | `item_45dias` | Vencimento $\le 45$ dias ($D_{venc} - D_{hoje} \le 45$) | Conferente, Gestão Executiva | In-App Push, Email SMTP | `0 1 * * *` (Diário às 01:00 AM) ou Evento | 3x, Backoff 300s Exp |
| **`trig_02`** | `stock_age_alert` | Stock Age Index $< 0.60$ ($52\%$ do Shelf Life decorrido) | Gestão de Escoamento, Conferente | In-App Push, Email SMTP | `0 2 * * *` (Diário às 02:00 AM) | 3x, Backoff 180s Linear |
| **`trig_03`** | `reunioes_recorrentes` | 15 min antes das Reuniões Matinais e Passagem de Turno | Todos os Colaboradores (Tag `armazem_facil`) | In-App Push | `45 06,14,22 * * 1-6` (15m antes do turno) | 2x, Backoff 60s Linear |
| **`trig_04`** | `fechamento_acao` | Homologação de encerramento via `POST /acoes/:id/fechar` | Administrativo, Conferente | In-App Push, Email SMTP | Event-Driven (Instantâneo) | 5x, Backoff 10s Exp |

---

## 3. Detalhamento Técnico dos Payloads e Formatos de Mensagem

### 3.1. Trigger `item_45dias` (Validade Crítica)
- **Condição**: Captura lotes que entraram na janela crítica de recolhimento ($\le 45$ dias do vencimento).
- **In-App Push**:
  > **Título**: 🚨 CRÍTICO RECOLHIMENTO 45D — CHOPP BRAHMA 50L  
  > **Mensagem**: Lote LOT-838-20260806 vence em 1 dia (2026-08-06). 3 caixas retidas no CCO. Ação de escoamento ou recolhimento necessária imediata.
- **E-mail HTML**:
  > **Assunto**: `[CCO GUARABIRA ALERTA] Item Crítico <=45 Dias: CHOPP BRAHMA BARRIL 50L`  
  > **Corpo**: Contém tabela explicativa do lote, quantidade em risco ($R\$ 255,00$) e link direto para a Workstation.

---

### 3.2. Trigger `stock_age_alert` (Stock Age Index $< 60\%$)
- **Condição**: Lotes cujo tempo de retenção ultrapassou a marca de $40\%$ da validade ($SAI < 0.60$).
- **In-App Push**:
  > **Título**: ⚠️ ALERTA STOCK AGE (<60%) — SKOL BEATS GT  
  > **Mensagem**: Lote L260801B com Stock Age Index de 0.52 (52%). Transferido automaticamente para o painel de Gestão de Escoamento para priorização FEFO.
- **E-mail HTML**:
  > **Assunto**: `[CCO GUARABIRA ALERTA] Stock Age Crítico (<60%): SKOL BEATS GT 269ML`  
  > **Corpo**: Alertas operacionais com recomendação de concessão de desconto promocional ou transferência de CD.

---

### 3.3. Trigger `reunioes_recorrentes` (Team Room & Passagem de Turno)
- **Condição**: Disparado 15 minutos antes das reuniões rituais de turno.
- **In-App Push**:
  > **Título**: 🔔 LEMBRETE: Team Room / Troca de Turno em 15 Minutos  
  > **Mensagem**: A Reunião Matinal de Alinhamento 5S e Giro FEFO iniciará às 07:00. Colaboradores com perfil 'armazem_facil' tiveram a presença confirmada automaticamente.

---

### 3.4. Trigger `fechamento_acao` (Recálculo de `percent_closed`)
- **Condição**: Evento gerado após a chamada do endpoint de encerramento do plano de 5 Porquês.
- **In-App Push**:
  > **Título**: ✅ PLANO DE AÇÃO ENCERRADO — Act-004  
  > **Mensagem**: O Plano de Ação dos 5 Porquês Act-004 foi homologado e fechado. Taxa de resolução de ações atualizada para 90.0%.

---

## 4. Política de Retentativa e Tolerância a Falhas (Retry Policy)

1. **Backoff Exponencial (Mensagens Críticas)**: Para `item_45dias` e `fechamento_acao`, o sistema realiza até 3 a 5 tentativas com intervalos duplicados ($10s \rightarrow 20s \rightarrow 40s \dots$), garantindo que indisponibilidades temporárias de rede não percam notificações do CCO.
2. **Log de Auditoria**: Cada tentativa de envio grava um registro na tabela `jobs` e `logs` indicando status de entrega (`DELIVERED`, `FAILED_RETRYING`, `DEAD_LETTER`).
