import fs from 'fs';

// 1. notifications_etapa6.json
const notificationsEtapa6 = {
  version: 'v1.0-TAPA_X',
  app: 'Workstation CCO Armazém Ambev Guarabira',
  triggers: [
    {
      id: 'trig_01_item_45dias',
      name: 'item_45dias',
      trigger_condition: 'Executado diariamente via Cron (0 1 * * *) ou no lançamento de lote quando (data_vencimento - CURRENT_DATE) <= 45 dias.',
      destinatarios: [
        'Conferente',
        'Gestão Executiva (Supervisor/Coordenador)'
      ],
      canais: [
        'IN_APP_PUSH',
        'EMAIL_SMTP'
      ],
      cron_expression: '0 1 * * *',
      retry_policy: {
        max_attempts: 3,
        backoff_delay_seconds: 300,
        exponential: true
      },
      payload_example: {
        event: 'ITEM_45DIAS_CRITICAL',
        demanda_id: 'a1b2c3d4-0001-4000-8000-000000000001',
        produto_codigo: '838',
        produto_descricao: 'CHOPP BRAHMA CLARO BARRIL KEG 50L',
        lote: 'LOT-838-20260806',
        quantidade_cx: 3,
        vencimento: '2026-08-06',
        dias_para_vencer: 1,
        valor_financeiro_risco_rs: 255.00,
        destino_workstation: 'Desvios',
        in_app_message: {
          title: '🚨 CRÍTICO RECOLHIMENTO 45D — CHOPP BRAHMA 50L',
          body: 'Lote LOT-838-20260806 vence em 1 dia (2026-08-06). 3 caixas retidas no CCO. Ação de escoamento ou recolhimento necessária imediata.'
        },
        email_message: {
          subject: '[CCO GUARABIRA ALERTA] Item Crítico <=45 Dias: CHOPP BRAHMA BARRIL 50L',
          body_html: '<h2>Aviso de Vencimento Crítico — Armazém Ambev Guarabira</h2><p>O SKU <b>838 - CHOPP BRAHMA CLARO BARRIL KEG 50L</b> (Lote: LOT-838-20260806) atingiu o prazo limite de recolhimento de 45 dias.</p><ul><li><b>Quantidade:</b> 3 caixas</li><li><b>Impacto Financeiro:</b> R$ 255,00</li><li><b>Data de Vencimento:</b> 2026-08-06</li><li><b>Destino CCO:</b> Módulo de Desvios / Escoamento</li></ul><p>Acesse a Workstation CCO para registrar o plano de ação FEFO.</p>'
        }
      }
    },
    {
      id: 'trig_02_stock_age_alert',
      name: 'stock_age_alert',
      trigger_condition: 'Disparado pelo Job diario (0 2 * * *) ou em atualizacoes quando stock_age_index < 0.60 (Stock Age < 60%).',
      destinatarios: [
        'Gestão de Escoamento',
        'Conferente'
      ],
      canais: [
        'IN_APP_PUSH',
        'EMAIL_SMTP'
      ],
      cron_expression: '0 2 * * *',
      retry_policy: {
        max_attempts: 3,
        backoff_delay_seconds: 180,
        exponential: false
      },
      payload_example: {
        event: 'STOCK_AGE_THRESHOLD_ALERT',
        demanda_id: 'a1b2c3d4-0002-4000-8000-000000000002',
        produto_codigo: '23269',
        produto_descricao: 'SKOL BEATS GT LONG NECK 269ML SIX-PACK',
        lote: 'L260801B',
        stock_age_index: 0.52,
        shelf_life_days: 180,
        dias_decorridos: 94,
        dias_restantes: 86,
        quantidade_cx: 5,
        destino_workstation: 'Gestão de Escoamento',
        in_app_message: {
          title: '⚠️ ALERTA STOCK AGE (<60%) — SKOL BEATS GT',
          body: 'Lote L260801B com Stock Age Index de 0.52 (52%). Transferido automaticamente para o painel de Gestão de Escoamento para priorização FEFO.'
        },
        email_message: {
          subject: '[CCO GUARABIRA ALERTA] Stock Age Crítico (<60%): SKOL BEATS GT 269ML',
          body_html: '<h2>Aviso de Giro de Estoque (Stock Age Index)</h2><p>O SKU <b>23269 - SKOL BEATS GT LONG NECK 269ML SIX-PACK</b> possui um índice de idade de estoque de <b>52%</b> (limite operacional: 60%).</p><p>Foram decorridos 94 dias do Shelf Life de 180 dias. Solicita-se atuação da Gestão de Escoamento para ação promocional ou transferência comercial.</p>'
        }
      }
    },
    {
      id: 'trig_03_reunioes_recorrentes',
      name: 'reunioes_recorrentes',
      trigger_condition: 'Agendado via Cron 15 minutos antes dos horários oficiais das reuniões (Team Room / Troca de Turno). Executa auto-presença para colaboradores com a tag armazem_facil.',
      destinatarios: [
        'Ajudante',
        'Operador Empilhadeira',
        'Conferente',
        'Administrativo'
      ],
      canais: [
        'IN_APP_PUSH'
      ],
      cron_expression: '45 06,14,22 * * 1-6',
      retry_policy: {
        max_attempts: 2,
        backoff_delay_seconds: 60,
        exponential: false
      },
      payload_example: {
        event: 'REUNIAO_RECORRENTE_REMINDER',
        reuniao_id: 'reu-2026-0805-01',
        titulo: 'Reunião Matinal Team Room & Passagem de Turno',
        horario_inicio: '2026-08-05T07:00:00-03:00',
        minutos_antecedencia: 15,
        auto_presence_tag: 'armazem_facil',
        presentes_auto_registrados_count: 18,
        in_app_message: {
          title: '🔔 LEMBRETE: Team Room / Troca de Turno em 15 Minutos',
          body: "A Reunião Matinal de Alinhamento 5S e Giro FEFO iniciará às 07:00. Colaboradores com perfil 'armazem_facil' tiveram a presença confirmada automaticamente."
        },
        email_message: null
      }
    },
    {
      id: 'trig_04_fechamento_acao',
      name: 'fechamento_acao',
      trigger_condition: 'Disparado imediatamente após a execução do endpoint POST /acoes/:id/fechar pela role Administrativo. Dispara o recálculo automático da métrica percent_closed dos 5 Porquês.',
      destinatarios: [
        'Administrativo',
        'Conferente'
      ],
      canais: [
        'IN_APP_PUSH',
        'EMAIL_SMTP'
      ],
      cron_expression: 'EVENT_DRIVEN',
      retry_policy: {
        max_attempts: 5,
        backoff_delay_seconds: 10,
        exponential: true
      },
      payload_example: {
        event: 'ACAO_CLOSED_RECALCULATE_METRICS',
        acao_id: 'act-004',
        desvio_id: 'desv-012',
        causa_raiz: 'Falta de conferência de data na entrada de notas pelo OCR do pátio.',
        fechado_por_id: 'colab-admin-001',
        fechado_em: '2026-08-05T08:14:32-07:00',
        metricas_recalculadas: {
          total_acoes_abertas: 10,
          total_acoes_fechadas: 9,
          percent_closed: 90.0
        },
        in_app_message: {
          title: '✅ PLANO DE AÇÃO ENCERRADO — Act-004',
          body: 'O Plano de Ação dos 5 Porquês Act-004 foi homologado e fechado. Taxa de resolução de ações atualizada para 90.0%.'
        },
        email_message: {
          subject: '[CCO GUARABIRA] Plano de Ação Encerrado e Métrica Recalculada',
          body_html: '<h2>Homologação de Plano de Ação (5 Porquês)</h2><p>O plano de ação <b>Act-004</b> relativo ao desvio no pátio foi homologado pela Supervisão.</p><p>A taxa global de encerramento de ações (<b>percent_closed</b>) do armazém subiu para <b>90.0%</b> (Meta DPO: 85.0%).</p>'
        }
      }
    }
  ]
};

// 2. testes_simulados_etapa6.json
const testesSimuladosEtapa6 = {
  version: 'v1.0-TAPA_X',
  suite_title: 'Cenários Simulados de Teste — Notificações, Triggers e Processamentos CCO',
  scenarios: [
    {
      scenario_id: 'scen_01_item_45dias',
      title: 'Simulação de Disparo de Validade Crítica (item_45dias)',
      description: 'Verifica se um lote com vencimento em <= 45 dias é capturado, atualiza a flag e dispara a notificação in-app + e-mail.',
      input_payload: {
        demanda_id: 'dem-sim-001',
        produto_codigo: '838',
        produto_descricao: 'CHOPP BRAHMA CLARO BARRIL KEG 50L',
        lote: 'LOT-SIM-838',
        quantidade: 3,
        venda_media: 2.5,
        data_vencimento: '2026-08-06',
        shelf_life_days: 180,
        simulated_current_date: '2026-08-05'
      },
      expected_outcome: {
        dias_para_vencer: 1,
        prazo_45dias_flag: true,
        destinoWorkstation: 'Desvios',
        requires_manual_review: false,
        notification_generated: true,
        notification_channels_dispatched: ['IN_APP_PUSH', 'EMAIL_SMTP'],
        recipients: ['Conferente', 'Gestão Executiva'],
        in_app_title_rendered: '🚨 CRÍTICO RECOLHIMENTO 45D — CHOPP BRAHMA 50L',
        audit_log_created: true
      }
    },
    {
      scenario_id: 'scen_02_stock_age_alert',
      title: 'Simulação de Alerta de Stock Age Index (< 60%)',
      description: 'Avalia o recálculo do Stock Age Index para lote envelhecido e seu redirecionamento para o painel de Gestão de Escoamento.',
      input_payload: {
        demanda_id: 'dem-sim-002',
        produto_codigo: '23269',
        produto_descricao: 'SKOL BEATS GT LONG NECK 269ML SIX-PACK',
        lote: 'LOT-SIM-23269',
        quantidade: 5,
        venda_media: 3.8,
        data_vencimento: '2026-10-30',
        shelf_life_days: 180,
        simulated_current_date: '2026-08-05'
      },
      expected_outcome: {
        dias_restantes: 86,
        dias_decorridos: 94,
        stock_age_index: 0.52,
        stock_age_alert_triggered: true,
        destino_workstation: 'Gestão de Escoamento',
        notification_channels_dispatched: ['IN_APP_PUSH', 'EMAIL_SMTP'],
        recipients: ['Gestão de Escoamento', 'Conferente'],
        in_app_title_rendered: '⚠️ ALERTA STOCK AGE (<60%) — SKOL BEATS GT'
      }
    },
    {
      scenario_id: 'scen_03_fechamento_acao_recalculo',
      title: 'Simulação de Encerramento de Plano de Ação e Recálculo de Métrica',
      description: 'Executa a homologação de encerramento do plano de ação Act-004 e valida a atualização do indicador percent_closed.',
      input_payload: {
        acao_id: 'act-004',
        parecer_encerramento: 'Treinamento executado com equipe de conferência. OCR recalibrado no pátio.',
        eficacia_comprovada: true,
        fechado_por: 'GLADSON SUPERVISOR',
        colaborador_id: 'colab-003',
        simulated_current_date: '2026-08-05T08:14:32-07:00'
      },
      expected_outcome: {
        status_acao: 'FECHADO',
        fechado_em: '2026-08-05T08:14:32-07:00',
        previous_percent_closed: 80.0,
        updated_percent_closed: 90.0,
        dpo_target_met: true,
        notification_dispatched: true,
        audit_trail_recorded: true
      }
    }
  ]
};

// Write files
fs.writeFileSync('notifications_etapa6.json', JSON.stringify(notificationsEtapa6, null, 2));
fs.writeFileSync('public/notifications_etapa6.json', JSON.stringify(notificationsEtapa6, null, 2));
fs.writeFileSync('notifications_etapa5.json', JSON.stringify(notificationsEtapa6, null, 2));
fs.writeFileSync('public/notifications_etapa5.json', JSON.stringify(notificationsEtapa6, null, 2));

fs.writeFileSync('testes_simulados_etapa6.json', JSON.stringify(testesSimuladosEtapa6, null, 2));
fs.writeFileSync('public/testes_simulados_etapa6.json', JSON.stringify(testesSimuladosEtapa6, null, 2));
fs.writeFileSync('testes_simulados_etapa5.json', JSON.stringify(testesSimuladosEtapa6, null, 2));
fs.writeFileSync('public/testes_simulados_etapa5.json', JSON.stringify(testesSimuladosEtapa6, null, 2));

console.log('Gerados arquivos JSON para Etapa 6.');
