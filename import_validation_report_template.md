# Relatório de Validação e Staging de Importação — Armazém Ambev Guarabira

**Data do Processamento**: 2026-08-05 08:20:00  
**Arquivo Analisado**: `validades_lote_marco2026.csv`  
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
- **Coluna**: `data_vencimento`
- **Valor Recebido**: `20/09/2026`
- **Grau de Inconsistência**: GRAVE (Violação do padrão internacional ISO 8601 `YYYY-MM-DD`).
- **Mensagem Formatada**: `Linha 12: Campo 'data_vencimento' possui valor inválido '20/09/2026'. Formato esperado: YYYY-MM-DD.`

### Erro 2 — Linha 18: SKU Não Cadastrado
- **Coluna**: `produto_codigo`
- **Valor Recebido**: `99999`
- **Grau de Inconsistência**: GRAVE (Código de produto não encontrado na tabela mestre `products`).
- **Mensagem Formatada**: `Linha 18: SKU '99999' não encontrado no catálogo mestre. Cadastre o SKU via POST /products antes da importação.`

### Erro 3 — Linha 23: Venda Média Nula ou Inválida
- **Coluna**: `venda_media_diaria`
- **Valor Recebido**: `-2.50`
- **Grau de Inconsistência**: MODERADA (Valor negativo invalida a fórmula de `dias_estoque`).
- **Mensagem Formatada**: `Linha 23: Campo 'venda_media_diaria' contém valor negativo '-2.50'. A média diária deve ser um número >= 0. Flagged: requires_manual_review = true.`

### Erro 4 — Linha 31: Lote sem Identificação (Campo Obrigatório Ausente)
- **Coluna**: `lote`
- **Valor Recebido**: `""` (String vazia)
- **Grau de Inconsistência**: GRAVE (Lote é chave essencial de rastreabilidade FEFO).
- **Mensagem Formatada**: `Linha 31: Campo obrigatório 'lote' está ausente ou em branco. O rastreamento FEFO exige código de lote válido.`

### Erro 5 — Linha 40: Incompatibilidade de Tipo Numérico
- **Coluna**: `quantidade_cx`
- **Valor Recebido**: `DEZ` (Texto em vez de inteiro)
- **Grau de Inconsistência**: GRAVE (Erro de conversão de tipo de dados).
- **Mensagem Formatada**: `Linha 40: Campo 'quantidade_cx' esperava valor inteiro, mas recebeu 'DEZ'.`

---

## 3. Ações Corretivas Orientadas ao Operador

1. Baixe o arquivo de modelo atualizado em `/templates_csv/validades.csv`.
2. Garanta que todas as datas sigam rigorosamente o formato `AAAA-MM-DD` (ex: `2026-09-20`).
3. Submeta o lote corrigido pelo painel de importação da Workstation CCO.
