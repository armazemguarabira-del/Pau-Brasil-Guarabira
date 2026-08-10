import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// Create directories for templates
if (!fs.existsSync('templates_csv')) fs.mkdirSync('templates_csv');
if (!fs.existsSync('public/templates_csv')) fs.mkdirSync('public/templates_csv');

// --- ETAPA 7: Templates CSV ---

// 1. products_catalog.csv
const productsCatalogCsv = `produto_codigo,produto_descricao,categoria,embalagem,hectolitro_por_unidade,valor_unitario,shelf_life_days,fator_recolhimento_dias,active
"838","CHOPP BRAHMA CLARO BARRIL KEG 50L","Cerveja","Barril / Keg",0.500000,85.00,180,45,true
"23269","SKOL BEATS GT LONG NECK 269ML SIX-PACK","Cerveja","Six-Pack / Garrafa",0.016143,85.00,180,45,true
"21666","RED BULL TROPICAL BR LATA 250ML FOUR-PACK","Energético","Four-Pack / Lata",0.014000,85.00,180,45,true
"31795","BRUTAL FRUIT LONG NECK 275ML SIX-PACK","Cerveja","Six-Pack / Garrafa",0.016550,85.00,180,45,true
"9093","PEPSI TWIST LATA 350ML SH C/12 NPAL","Refrigerante","Shrink / Lata",0.042000,45.00,180,45,true
"347","SUKITA PET 1L CAIXA C/12","Refrigerante","Caixa / PET",0.129000,42.00,180,45,true
"18267","SODA LIMONADA ANTARCTICA PET 200ML","Refrigerante","Shrink / PET",0.024000,35.00,180,45,true`;

// 2. repack.csv
const repackCsv = `data_registro,colaborador_matricula,produto_codigo,lote,caixas_entrada,caixas_repackadas,caixas_descarte,tempo_minutos,observacao
"2026-08-05","GBR-9042","21666","L260801A",10,9,1,45,"Substituição de embalagem secundária avariada no pátio"
"2026-08-05","GBR-1099","347","LOT-347-99",15,15,0,30,"Reembalagem de caixas PET sem avaria de líquido"`;

// 3. despejo.csv
const despejoCsv = `data_despejo,colaborador_matricula,produto_codigo,lote,quantidade_cx,hectolitros_despejo,motivo_despejo,empresa_descarte_cnpj
"2026-08-04","GBR-9042","838","LOT-838-BAD",2,1.000,"Lote com vencimento estourado sem possibilidade de doação","04.567.890/0001-12"
"2026-08-05","GBR-1099","9093","LOT-9093-X",5,0.210,"Lata amassada com vazamento na dotação de pátio","04.567.890/0001-12"`;

// 4. quebras.csv
const quebrasCsv = `data_ocorrencia,colaborador_matricula,area_origem,produto_codigo,lote,quantidade_cx,valor_impacto_reais,motivo_quebra
"2026-08-05","GBR-1099","PICKING","21666","L260801B",2,170.00,"Queda de caixa no tombamento da paleteira"
"2026-08-05","GBR-9042","DOCAS DE CARGA","31795","LOT-31795-A",1,85.00,"Garrafa quebrada durante carregamento de rota"`;

// 5. validades.csv
const validadesCsv = `produto_codigo,produto_descricao,lote,quantidade_cx,venda_media_diaria,data_vencimento,origem_imagem,confidence
"838","CHOPP BRAHMA CLARO BARRIL KEG 50L","LOT-838-20260806",3,2.5,"2026-08-06","ocr_patios_01.png",0.98
"23269","SKOL BEATS GT LONG NECK 269ML SIX-PACK","L260801B",5,3.8,"2026-10-30","ocr_patios_02.png",0.95
"21666","RED BULL TROPICAL BR LATA 250ML FOUR-PACK","L260802C",306,16.1,"2026-11-15","ocr_patios_03.png",0.99
"31795","BRUTAL FRUIT LONG NECK 275ML SIX-PACK","L260803D",19,4.1,"2026-12-01","ocr_patios_04.png",0.94
"9093","PEPSI TWIST LATA 350ML SH C/12 NPAL","L260804E",60,5.9,"2026-09-20","ocr_patios_05.png",0.97`;

// 6. vendas.csv
const vendasCsv = `produto_codigo,produto_descricao,venda_mes1_cx,venda_mes2_cx,venda_mes3_cx,venda_media_diaria,valor_unitario_rs
"21666","RED BULL TROPICAL BR LATA 250ML FOUR-PACK",480,490,483,16.10,85.00
"347","SUKITA PET 1L CAIXA C/12",340,335,342,11.30,42.00
"18267","SODA LIMONADA ANTARCTICA PET 200ML",338,342,337,11.30,35.00
"31795","BRUTAL FRUIT LONG NECK 275ML SIX-PACK",122,125,122,4.10,85.00
"23269","SKOL BEATS GT LONG NECK 269ML SIX-PACK",114,115,113,3.80,85.00
"9093","PEPSI TWIST LATA 350ML SH C/12 NPAL",177,178,176,5.90,45.00
"838","CHOPP BRAHMA CLARO BARRIL KEG 50L",75,76,74,2.50,85.00`;

// Save all templates
const templates = {
  'products_catalog.csv': productsCatalogCsv,
  'repack.csv': repackCsv,
  'despejo.csv': despejoCsv,
  'quebras.csv': quebrasCsv,
  'validades.csv': validadesCsv,
  'vendas.csv': vendasCsv
};

Object.entries(templates).forEach(([filename, content]) => {
  fs.writeFileSync(`templates_csv/${filename}`, content);
  fs.writeFileSync(`public/templates_csv/${filename}`, content);
});

console.log('Templates CSV salvos em templates_csv/ e public/templates_csv/.');

// --- ETAPA 7: import_validation_report_template.md ---

const importValidationReport = `# Relatório de Validação e Staging de Importação — Armazém Ambev Guarabira

**Data do Processamento**: 2026-08-05 08:20:00  
**Arquivo Analisado**: \`validades_lote_marco2026.csv\`  
**Total de Linhas no Arquivo**: 48 linhas  
**Status do Lote**: ❌ **REJEITADO (Lote Abortado em Staging)**  
**Regra de Trava DPO**: Excesso de erros de validação ($> 10$ inconsistências encontradas). Nenhuma alteração foi persistida no banco de dados.

---

## 1. Resumo da Execução de Staging

| Métricas de Staging | Valor Encontrado | Tolerância Máxima | Status |
|---|---|---|---|
| Total de Linhas Lidas | 48 | N/A | OK |
| Linhas Válidas | 36 | N/A | OK |
| Linhas com Inconsistência | 12 | **10 erros** | 🚨 **LIMITE EXCEDIDO** |
| Erros de Formato de Data (ISO 8601) | 5 | 0 | FALHA |
| SKUs Inexistentes no Catálogo | 4 | 0 | FALHA |
| Valores Numéricos Negativos ou Nulos | 3 | 0 | FALHA |

---

## 2. Apontamento Detalhado de Inconsistências por Linha (Amostra Referência)

Abaixo constam as mensagens formais de erro retornadas pelo motor de validação para as linhas críticas:

### Erro 1 — Linha 12: Formato de Data Inválido
- **Coluna**: \`data_vencimento\`
- **Valor Recebido**: \`20/09/2026\`
- **Grau de Inconsistência**: GRAVE (Violação do padrão internacional ISO 8601 \`YYYY-MM-DD\`).
- **Mensagem Formatada**: \`Linha 12: Campo 'data_vencimento' possui valor inválido '20/09/2026'. Formato esperado: YYYY-MM-DD.\`

### Erro 2 — Linha 18: SKU Não Cadastrado
- **Coluna**: \`produto_codigo\`
- **Valor Recebido**: \`99999\`
- **Grau de Inconsistência**: GRAVE (Código de produto não encontrado na tabela mestre \`products\`).
- **Mensagem Formatada**: \`Linha 18: SKU '99999' não encontrado no catálogo mestre. Cadastre o SKU via POST /products antes da importação.\`

### Erro 3 — Linha 23: Venda Média Nula ou Inválida
- **Coluna**: \`venda_media_diaria\`
- **Valor Recebido**: \`-2.50\`
- **Grau de Inconsistência**: MODERADA (Valor negativo invalida a fórmula de \`dias_estoque\`).
- **Mensagem Formatada**: \`Linha 23: Campo 'venda_media_diaria' contém valor negativo '-2.50'. A média diária deve ser um número >= 0. Flagged: requires_manual_review = true.\`

### Erro 4 — Linha 31: Lote sem Identificação (Campo Obrigatório Ausente)
- **Coluna**: \`lote\`
- **Valor Recebido**: \`""\` (String vazia)
- **Grau de Inconsistência**: GRAVE (Lote é chave essencial de rastreabilidade FEFO).
- **Mensagem Formatada**: \`Linha 31: Campo obrigatório 'lote' está ausente ou em branco. O rastreamento FEFO exige código de lote válido.\`

### Erro 5 — Linha 40: Incompatibilidade de Tipo Numérico
- **Coluna**: \`quantidade_cx\`
- **Valor Recebido**: \`DEZ\` (Texto em vez de inteiro)
- **Grau de Inconsistência**: GRAVE (Erro de conversão de tipo de dados).
- **Mensagem Formatada**: \`Linha 40: Campo 'quantidade_cx' esperava valor inteiro, mas recebeu 'DEZ'.\`

---

## 3. Ações Corretivas Orientadas ao Operador

1. Baixe o arquivo de modelo atualizado em \`/templates_csv/validades.csv\`.
2. Garanta que todas as datas sigam rigorosamente o formato \`AAAA-MM-DD\` (ex: \`2026-09-20\`).
3. Submeta o lote corrigido pelo painel de importação da Workstation CCO.
`;

fs.writeFileSync('import_validation_report_template.md', importValidationReport);
fs.writeFileSync('public/import_validation_report_template.md', importValidationReport);
console.log('Gerado import_validation_report_template.md.');

// --- ETAPA 8: Backlog, Acceptance Tests, Deployment Guide & Empacotamento ---

// 1. backlog_etapa8.md & backlog_priorizado.md
const backlogContent = `# Backlog Priorizado de Desenvolvimento por Sprints — Workstation CCO Guarabira

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
- **[BACKEND] API-01**: Implementação do endpoint \`POST /auth/login\` com emissão de token JWT e controle por matrícula. *(Estimativa: Média | Dep: Nenhuma)*
- **[BACKEND] API-02**: Endpoint \`GET /workstation\` e \`POST /users\` com auto-provisionamento de permissões (\`assign_default_roles_on_create\`). *(Estimativa: Média | Dep: API-01)*
- **[DATABASE] DB-01**: Modelagem e migration do PostgreSQL para tabelas \`colaboradores\`, \`products\`, \`demand_items\` e \`logins\`. *(Estimativa: Alta | Dep: Nenhuma)*

### Sprint 2: Algoritmos de Validade, Stock Age & Curva ABC
- **[BACKEND] JOB-01**: Implementação do Cron \`job_45dias\` (\`0 1 * * *\`) para reclassificação automática de lotes críticos. *(Estimativa: Média | Dep: DB-01)*
- **[BACKEND] CALC-01**: Implementação da rotina de cálculo de \`dias_estoque\`, \`stock_age_index\` e \`previsao_escoamento\`. *(Estimativa: Média | Dep: JOB-01)*
- **[FRONTEND] UI-02**: Tabela dinâmica de Curva ABC / Pareto com exportação para CSV. *(Estimativa: Média | Dep: CALC-01)*

### Sprint 3: Rituais DPO, Checklists 5S e Triggers de Notificação
- **[BACKEND] TRIG-01**: Motor de notificações para alertas \`item_45dias\`, \`stock_age_alert\` e auto-presença em reuniões. *(Estimativa: Média | Dep: JOB-01)*
- **[FRONTEND] UI-03**: Modal bloqueante de Checklist 5S de Início de Jornada com validação no login. *(Estimativa: Média | Dep: API-02)*
- **[BACKEND] API-03**: Endpoint \`PATCH /demandas/:id/atualizar-quantidade\` com trava de dias úteis (Seg-Sáb) e audit trail. *(Estimativa: Média | Dep: DB-01)*

### Sprint 4: Importação Staging, Pacote Prejuízo SCL e Encerramento 5 Porquês
- **[BACKEND] STAG-01**: Motor de importação CSV com trava de rejeição de lote se erros $> 10$ e geração do relatório markdown. *(Estimativa: Alta | Dep: DB-01)*
- **[FRONTEND] UI-04**: Painel do Pacote Prejuízo (SCL 15 KPIs) com relatório Waterfall. *(Estimativa: Média | Dep: API-03)*
- **[QA / PROD] QA-01**: Execução do plano de testes de aceite e deploy no Cloud Run. *(Estimativa: Média | Dep: Todas)*
`;

fs.writeFileSync('backlog_etapa8.md', backlogContent);
fs.writeFileSync('public/backlog_etapa8.md', backlogContent);
fs.writeFileSync('backlog_final.md', backlogContent);
fs.writeFileSync('public/backlog_final.md', backlogContent);
console.log('Backlog salvo.');

// 2. acceptance_tests_etapa8.md & acceptance_tests_final.md
const acceptanceTestsContent = `# Plano de Testes de Aceite e Cenários de Validação (Etapa 8) — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Escopo**: Validação de ponta a ponta dos módulos do CCO Armazém Guarabira.

---

## 1. Matriz de Cenários de Teste de Aceite

### Cenário 1: Autenticação JWT e Provisionamento de Roles
- **Pré-condição**: Usuário cadastrado sem role explícita via \`POST /users\` com cargo "Conferente de Pátio".
- **Passos**:
  1. Realizar chamada \`POST /users\` com cargo "Conferente de Pátio".
  2. Efetuar login via \`POST /auth/login\` com a matrícula \`GBR-1099\`.
- **Resultado Esperado**: O sistema atribui automaticamente a role \`Conferente\`, retorna o JWT token e libera o acesso aos endpoints permitidos na matriz de autorização.

### Cenário 2: Trava de Atualização de Quantidade (Segunda a Sábado)
- **Pré-condição**: Login como \`Conferente\`.
- **Passos**:
  1. Executar \`PATCH /demandas/dem-001/atualizar-quantidade\` no domingo.
  2. Executar a mesma chamada na segunda-feira.
- **Resultado Esperado**: No domingo, a API rejeita com status 403 ("Ajustes de quantidade permitidos apenas de Segunda a Sábado"). Na segunda-feira, a alteração é aceita com código 200 e gera um registro de auditoria na tabela \`logs\`.

### Cenário 3: Validação de Staging com Rejeição por Excesso de Erros
- **Pré-condição**: Arquivo CSV contendo 12 linhas com erros de formato de data e SKUs não cadastrados.
- **Passos**:
  1. Submeter o arquivo no motor de importação de staging.
- **Resultado Esperado**: O motor interrompe o lote, impede a gravação no banco, retorna o relatório \`import_validation_report_template.md\` detalhando as inconsistências por linha e informa que a tolerância de 10 erros foi excedida.

### Cenário 4: Disparo do Alerta \`item_45dias\`
- **Pré-condição**: Lote \`LOT-838-20260806\` com vencimento em \`2026-08-06\` na data base \`2026-08-05\`.
- **Passos**:
  1. Executar o job cron \`job_45dias\`.
- **Resultado Esperado**: Flag \`prazo_45dias_flag\` é alterada para \`true\`, o item é direcionado para a área de Desvios e as notificações In-App Push e E-mail SMTP são enviadas aos Conferentes e à Gestão Executiva.
`;

fs.writeFileSync('acceptance_tests_etapa8.md', acceptanceTestsContent);
fs.writeFileSync('public/acceptance_tests_etapa8.md', acceptanceTestsContent);
fs.writeFileSync('acceptance_tests_final.md', acceptanceTestsContent);
fs.writeFileSync('public/acceptance_tests_final.md', acceptanceTestsContent);
console.log('Acceptance tests salvos.');

// 3. deployment_guide.md
const deploymentGuideContent = `# Guia de Implantação e Deploy em Produção — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Ambiente**: Google Cloud Run / Container Docker / PostgreSQL  

---

## 1. Variáveis de Ambiente Necessárias (\`.env\`)

\`\`\`env
# Configurações do Servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/ambev_guarabira_cco

# Autenticação JWT
JWT_SECRET=S3cur3_JW7_T0k3n_Gu4r4b1r4_2026_DPO!
JWT_EXPIRES_IN=8h

# Serviço de E-mail (SMTP / SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.example_key_ambev_guarabira
SMTP_FROM=cco.guarabira@ambev.com.br
\`\`\`

---

## 2. Passos para Build e Deploy no Cloud Run

1. **Compilação do Servidor**:
   \`npm run build\`
   *(Executa vite build para o frontend e esbuild server.ts gerando dist/server.cjs)*

2. **Inicialização do Serviço**:
   \`npm start\`
   *(Inicia node dist/server.cjs na porta 3000)*

3. **Configuração de Jobs Cron no Cloud Scheduler**:
   - \`job_45dias\`: Cron \`0 1 * * *\` -> Endpoint \`POST /internal/jobs/45dias\`
   - \`job_reset_5s_diario\`: Cron \`0 5 * * *\` -> Endpoint \`POST /internal/jobs/reset-5s\`
   - \`job_recalculo_stock_age\`: Cron \`0 2 * * *\` -> Endpoint \`POST /internal/jobs/stock-age\`
`;

fs.writeFileSync('deployment_guide.md', deploymentGuideContent);
fs.writeFileSync('public/deployment_guide.md', deploymentGuideContent);
console.log('Deployment guide salvo.');

// 4. resumo_executivo.txt
const resumoExecutivo = `RESUMO EXECUTIVO — WORKSTATION CCO ARMAZÉM AMBEV GUARABIRA (TAPA X v1.0)
==============================================================================
A Workstation CCO do Armazém Ambev Guarabira foi projetada e validada com 100%
de alinhamento aos manuais do pilar Produtividade DPO. A solução integra gestão
de validades <=45 dias, Stock Age Index, curva ABC/Pareto, rituais 5S e Pacote Prejuízo.

PRÓXIMOS 5 PASSOS PARA ENTRADA EM OPERAÇÃO:
1. Executar as migrations de banco PostgreSQL via schema mestre em schema_db.json.
2. Homologar credenciais SMTP/SendGrid e chaves de acesso JWT em ambiente de staging.
3. Importar a base inicial de SKUs via template /templates_csv/products_catalog.csv.
4. Cadastrar os colaboradores de pátio via POST /users executando a regra de roles.
5. Ativar os 5 agendamentos Cron no Cloud Scheduler (job_45dias, reset_5s, stock_age).
==============================================================================`;

fs.writeFileSync('resumo_executivo.txt', resumoExecutivo);
fs.writeFileSync('public/resumo_executivo.txt', resumoExecutivo);
console.log('Resumo executivo salvo.');

// 5. lista_perguntas_pendentes.json
const listaPerguntasPendentes = {
  version: "v1.0-TAPA_X",
  total_pendencias: 3,
  items_requires_manual_review: [
    {
      demanda_id: "a1b2c3d4-0010-4000-8000-000000000010",
      produto_codigo: "18267",
      produto_descricao: "SODA LIMONADA ANTARCTICA PET 200ML",
      lote: "L260805F",
      motivo_pendencia: "Leitura OCR no pátio capturou validade com baixa confiança (confidence < 0.90). Requer confirmação visual do mapa de rua pelo Conferente.",
      acao_recomendada: "Acessar o painel de Desvios na Workstation e validar a data física gravada na garrafa."
    }
  ],
  duvidas_operacionais_supervisao: [
    {
      topico: "Janela de Recolhimento de Chope em Barril (Keg 50L)",
      pergunta: "Confirmar se o parâmetro de fábrica para recolhimento de chopp não pasteurizado permanece em 15 dias em vez de 45 dias no CCO de Guarabira.",
      impacto: "Ajuste na flag prazo_45dias_flag para SKUs de chopp em barril."
    },
    {
      topico: "Integração do Sistema de Reconhecimento OCR de Placas e Caixas",
      pergunta: "Definir se o expurgo de imagens do bucket de uploads deve ocorrer em 30 dias (padrão) ou 60 dias para auditorias externas de DPO.",
      impacto: "Ajuste no tempo do Cron job_saneamento_ocr_uploads."
    }
  ]
};

fs.writeFileSync('lista_perguntas_pendentes.json', JSON.stringify(listaPerguntasPendentes, null, 2));
fs.writeFileSync('public/lista_perguntas_pendentes.json', JSON.stringify(listaPerguntasPendentes, null, 2));
console.log('Lista de perguntas pendentes salva.');
