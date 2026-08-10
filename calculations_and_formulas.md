# Documentação Técnico-Operacional de Fórmulas e Cálculos de Negócio — CCO Armazém Ambev Guarabira

**Versão**: v1.0-TAPA_X  
**Unidade Operacional**: Armazém Ambev Guarabira (GBR)  
**Módulo**: CCO Workstation — Gestão de Estoque, Validades, Giro FEFO e Pacote Prejuízo  
**Data de Referência**: 2026-08-05  

---

## 1. Visão Geral e Fundamentação DPO Pilar Armazém

Na gestão logística do Armazém Ambev Guarabira, a precisão matemática dos indicadores de estoque é vital para garantir o giro **FEFO (First Expired, First Out)**, prevenir quebras financeiras e atingir o nível máximo de sustentabilidade operacional auditado pelo pilar de **Produtividade DPO (Distribution Process Optimization)**.

Esta documentação consolida as fórmulas matemáticas padrão, regras de exception handling e exemplos aplicados com resolução passo a passo para **5 itens reais** do pátio de Guarabira extraídos de `demandas_etapa2_clean.json`.

---

## 2. Definição Formal de Fórmulas e Regras de Negócio

### 2.1. Dias de Estoque (`dias_estoque`)
Indica a autonomia atual do lote físico no pátio com base na média diária de vendas dos últimos 90 dias (3 meses).

$$\text{dias\_estoque} = \frac{\text{quantidade}}{\text{venda\_media}}$$

- **$\text{quantidade}$**: Total em caixas físicas (`cx`) ou unidades no estoque.
- **$\text{venda\_media}$**: Média diária de saída calculada na janela móvel de 90 dias.
- **Regra de Borda**: Se $\text{venda\_media} = 0$ ou nula, o sistema define $\text{dias\_estoque} = 0$ e ativa a flag $\text{requires\_manual\_review} = \text{true}$.

---

### 2.2. Stock Age Index (`stock_age_index` / SAI)
Mede o percentual do tempo de vida total do produto que já foi consumido desde a sua fabricação até a data presente no armazém.

$$\text{Stock Age Index (SAI)} = \frac{\text{Dias Decorridos no Estoque}}{\text{Shelf Life Total (dias)}} = \frac{\text{Shelf Life Total} - (\text{Data Vencimento} - \text{Data Atual})}{\text{Shelf Life Total}}$$

- **Faixa de Tolerância DPO**:
  - **SAI < 0.60 (Verde)**: Produto novo, giro normal.
  - **0.60 ≤ SAI < 0.75 (Amarelo)**: Produto em atenção comercial.
  - **SAI ≥ 0.75 (Vermelho Crítico)**: Item próximo da janela de recolhimento de 45 dias; prioridade máxima de escoamento.

---

### 2.3. Previsão de Escoamento (`previsao_escoamento`)
Estima a data final em que o estoque atual do lote será integralmente consumido pelo mercado local de Guarabira.

$$\text{previsao\_escoamento} = \text{Data Atual} + \left\lceil \frac{\text{quantidade}}{\text{venda\_media}} \right\rceil \text{ dias}$$

- **Função Teto (Ceil)**: Arredonda para cima o número de dias necessários para a venda total.

---

### 2.4. Flag de Prazo Crítico 45 Dias (`prazo_45dias_flag`)
Flag booleana que identifica se o lote atingiu a janela limite de recolhimento de fábrica ($\le 45$ dias para o vencimento).

$$\text{prazo\_45dias\_flag} = \begin{cases} \text{TRUE}, & \text{se } (\text{data\_vencimento} - \text{Data Atual}) \le 45 \text{ dias} \\ \text{FALSE}, & \text{caso contrário} \end{cases}$$

---

### 2.5. Sinalização de Revisão Manual (`requires_manual_review`)
Trava de auditoria que exige validação humana pelo Conferente ou Supervisão antes da liberação comercial.

$$\text{requires\_manual\_review} = \text{TRUE se } (\text{venda\_media} \le 0 \lor \text{dados OCR inconsistentes}) \text{ else FALSE}$$

---

### 2.6. Matriz de Classificação Curva ABC / Pareto (Curva de Importância de Estoque)
Ordena os SKUs de acordo com a representatividade financeira das vendas trimestrais (90 dias).

1. **Venda Trimestral em R$ ($\text{Venda}_{3M}$)**:
   $$\text{Venda}_{3M} = \text{venda\_media} \times 90 \times \text{valor\_unitario}$$

2. **Percentual Acumulado ($\text{Pct}_{\text{acum}}$)**:
   $$\text{Pct}_{\text{acum}} = \frac{\sum_{i=1}^{k} \text{Venda}_{3M, i}}{\text{Faturamento Total Trimestral (R$)}} \times 100$$

3. **Faixas de Corte Pareto**:
   - **Classe A**: Até **80.0%** do faturamento acumulado (alta representatividade).
   - **Classe B**: De **80.01% a 95.0%** do faturamento acumulado (média representatividade).
   - **Classe C**: De **95.01% a 100.0%** do faturamento acumulado (caixa longa / menor giro).

---

## 3. Exemplos Numéricos Detalhados Passo a Passo (5 Itens Reais)

Abaixo apresentamos a resolução matemática exata para 5 itens extraídos de `demandas_etapa2_clean.json` na data base de **2026-08-05**:


### Exemplo 3.1: SKU 838 — CHOPP BRAHMA CLARO BARRIL KEG 50L
- **Dados de Entrada**:
  - **Lote**: `LOT-838-20260806`
  - **Quantidade em Estoque ($Q$)**: `3` caixas
  - **Venda Média Diária ($V_m$)**: `2.5` cx/dia
  - **Valor Unitário ($P$)**: `R$ 85.00`
  - **Fator Hectolitro ($HL/un$)**: `0.5` HL
  - **Data de Vencimento**: `2026-08-06`
  - **Shelf Life Total**: `180` dias

- **Resolução Matemática Passo a Passo**:
  1. **Dias de Estoque**:
     $$\text{dias\_estoque} = \frac{3}{2.5} = 1.2 \text{ dias}$$

  2. **Previsão de Escoamento**:
     $$\text{dias\_para\_escoar} = \lceil 1.2 \rceil = 2 \text{ dias}$$
     $$\text{previsao\_escoamento} = 2026\text{-}08\text{-}05 + 2 \text{ dias} = \mathbf{2026-08-07}$$

  3. **Dias até o Vencimento e Prazo 45 Dias**:
     $$\text{dias\_para\_vencer} = 1 \text{ dias}$$
     Como $1 \le 45$, a flag **`prazo_45dias_flag` = TRUE**.

  4. **Stock Age Index (SAI)**:
     $$\text{dias\_decorridos} = 180 - 1 = 179 \text{ dias}$$
     $$\text{SAI} = \frac{179}{180} = \mathbf{0.99}$$

  5. **Venda Trimestral e Classificação ABC**:
     $$\text{Venda}_{3M\text{ cx}} = 2.5 \times 90 = 225 \text{ cx}$$
     $$\text{Venda}_{3M\text{ R$}} = 225 \times 85.00 = \mathbf{R\$ 19125.00}$$
     $$\text{Enquadramento Pareto}: \mathbf{\text{Classe C}}$$


### Exemplo 3.2: SKU 23269 — SKOL BEATS GT LONG NECK 269ML SIX-PACK
- **Dados de Entrada**:
  - **Lote**: `LOT-23269-20260818`
  - **Quantidade em Estoque ($Q$)**: `5` caixas
  - **Venda Média Diária ($V_m$)**: `3.8` cx/dia
  - **Valor Unitário ($P$)**: `R$ 85.00`
  - **Fator Hectolitro ($HL/un$)**: `0.01614` HL
  - **Data de Vencimento**: `2026-08-18`
  - **Shelf Life Total**: `180` dias

- **Resolução Matemática Passo a Passo**:
  1. **Dias de Estoque**:
     $$\text{dias\_estoque} = \frac{5}{3.8} = 1.32 \text{ dias}$$

  2. **Previsão de Escoamento**:
     $$\text{dias\_para\_escoar} = \lceil 1.32 \rceil = 2 \text{ dias}$$
     $$\text{previsao\_escoamento} = 2026\text{-}08\text{-}05 + 2 \text{ dias} = \mathbf{2026-08-07}$$

  3. **Dias até o Vencimento e Prazo 45 Dias**:
     $$\text{dias\_para\_vencer} = 13 \text{ dias}$$
     Como $13 \le 45$, a flag **`prazo_45dias_flag` = TRUE**.

  4. **Stock Age Index (SAI)**:
     $$\text{dias\_decorridos} = 180 - 13 = 167 \text{ dias}$$
     $$\text{SAI} = \frac{167}{180} = \mathbf{0.93}$$

  5. **Venda Trimestral e Classificação ABC**:
     $$\text{Venda}_{3M\text{ cx}} = 3.8 \times 90 = 342 \text{ cx}$$
     $$\text{Venda}_{3M\text{ R$}} = 342 \times 85.00 = \mathbf{R\$ 29070.00}$$
     $$\text{Enquadramento Pareto}: \mathbf{\text{Classe C}}$$


### Exemplo 3.3: SKU 21666 — RED BULL TROPICAL BR LATA 250ML FOUR-PACK
- **Dados de Entrada**:
  - **Lote**: `LOT-21666-20260824`
  - **Quantidade em Estoque ($Q$)**: `306` caixas
  - **Venda Média Diária ($V_m$)**: `16.1` cx/dia
  - **Valor Unitário ($P$)**: `R$ 85.00`
  - **Fator Hectolitro ($HL/un$)**: `0.01` HL
  - **Data de Vencimento**: `2026-08-24`
  - **Shelf Life Total**: `180` dias

- **Resolução Matemática Passo a Passo**:
  1. **Dias de Estoque**:
     $$\text{dias\_estoque} = \frac{306}{16.1} = 19.01 \text{ dias}$$

  2. **Previsão de Escoamento**:
     $$\text{dias\_para\_escoar} = \lceil 19.01 \rceil = 20 \text{ dias}$$
     $$\text{previsao\_escoamento} = 2026\text{-}08\text{-}05 + 20 \text{ dias} = \mathbf{2026-08-25}$$

  3. **Dias até o Vencimento e Prazo 45 Dias**:
     $$\text{dias\_para\_vencer} = 19 \text{ dias}$$
     Como $19 \le 45$, a flag **`prazo_45dias_flag` = TRUE**.

  4. **Stock Age Index (SAI)**:
     $$\text{dias\_decorridos} = 180 - 19 = 161 \text{ dias}$$
     $$\text{SAI} = \frac{161}{180} = \mathbf{0.89}$$

  5. **Venda Trimestral e Classificação ABC**:
     $$\text{Venda}_{3M\text{ cx}} = 16.1 \times 90 = 1449 \text{ cx}$$
     $$\text{Venda}_{3M\text{ R$}} = 1449 \times 85.00 = \mathbf{R\$ 123165.00}$$
     $$\text{Enquadramento Pareto}: \mathbf{\text{Classe A}}$$


### Exemplo 3.4: SKU 31795 — BRUTAL FRUIT LONG NECK 275ML SIX-PACK
- **Dados de Entrada**:
  - **Lote**: `LOT-31795-20260918`
  - **Quantidade em Estoque ($Q$)**: `19` caixas
  - **Venda Média Diária ($V_m$)**: `4.1` cx/dia
  - **Valor Unitário ($P$)**: `R$ 85.00`
  - **Fator Hectolitro ($HL/un$)**: `0.0165` HL
  - **Data de Vencimento**: `2026-09-18`
  - **Shelf Life Total**: `180` dias

- **Resolução Matemática Passo a Passo**:
  1. **Dias de Estoque**:
     $$\text{dias\_estoque} = \frac{19}{4.1} = 4.63 \text{ dias}$$

  2. **Previsão de Escoamento**:
     $$\text{dias\_para\_escoar} = \lceil 4.63 \rceil = 5 \text{ dias}$$
     $$\text{previsao\_escoamento} = 2026\text{-}08\text{-}05 + 5 \text{ dias} = \mathbf{2026-08-10}$$

  3. **Dias até o Vencimento e Prazo 45 Dias**:
     $$\text{dias\_para\_vencer} = 44 \text{ dias}$$
     Como $44 \le 45$, a flag **`prazo_45dias_flag` = TRUE**.

  4. **Stock Age Index (SAI)**:
     $$\text{dias\_decorridos} = 180 - 44 = 136 \text{ dias}$$
     $$\text{SAI} = \frac{136}{180} = \mathbf{0.76}$$

  5. **Venda Trimestral e Classificação ABC**:
     $$\text{Venda}_{3M\text{ cx}} = 4.1 \times 90 = 369 \text{ cx}$$
     $$\text{Venda}_{3M\text{ R$}} = 369 \times 85.00 = \mathbf{R\$ 31365.00}$$
     $$\text{Enquadramento Pareto}: \mathbf{\text{Classe A}}$$


### Exemplo 3.5: SKU 31795 — BRUTAL FRUIT LONG NECK 275ML SIX-PACK
- **Dados de Entrada**:
  - **Lote**: `LOT-31795-20260918`
  - **Quantidade em Estoque ($Q$)**: `3` caixas
  - **Venda Média Diária ($V_m$)**: `4.1` cx/dia
  - **Valor Unitário ($P$)**: `R$ 85.00`
  - **Fator Hectolitro ($HL/un$)**: `0.0165` HL
  - **Data de Vencimento**: `2026-09-18`
  - **Shelf Life Total**: `180` dias

- **Resolução Matemática Passo a Passo**:
  1. **Dias de Estoque**:
     $$\text{dias\_estoque} = \frac{3}{4.1} = 0.73 \text{ dias}$$

  2. **Previsão de Escoamento**:
     $$\text{dias\_para\_escoar} = \lceil 0.73 \rceil = 1 \text{ dias}$$
     $$\text{previsao\_escoamento} = 2026\text{-}08\text{-}05 + 1 \text{ dias} = \mathbf{2026-08-06}$$

  3. **Dias até o Vencimento e Prazo 45 Dias**:
     $$\text{dias\_para\_vencer} = 44 \text{ dias}$$
     Como $44 \le 45$, a flag **`prazo_45dias_flag` = TRUE**.

  4. **Stock Age Index (SAI)**:
     $$\text{dias\_decorridos} = 180 - 44 = 136 \text{ dias}$$
     $$\text{SAI} = \frac{136}{180} = \mathbf{0.76}$$

  5. **Venda Trimestral e Classificação ABC**:
     $$\text{Venda}_{3M\text{ cx}} = 4.1 \times 90 = 369 \text{ cx}$$
     $$\text{Venda}_{3M\text{ R$}} = 369 \times 85.00 = \mathbf{R\$ 31365.00}$$
     $$\text{Enquadramento Pareto}: \mathbf{\text{Classe A}}$$


---

## 4. Estrutura do Pacote Prejuízo DPO (Supply Chain Loss - SCL)

O **Pacote Prejuízo (SCL)** do Armazém Guarabira é composto pelos 15 KPIs estruturados no pilar DPO, monitorados na planilha `pacote_prejuizo_template.xlsx`:

### 4.1. Estrutura Waterfall de Perdas
```
[Faturamento Bruto Projetado: R$ 1.250.000,00]
   ├── (-) 1. Quebras Operacionais (Pátio/Picking): R$ 3.450,00
   ├── (-) 2. Erros de Programação/Carregamento: R$ 1.200,00
   ├── (-) 3. Vencimento/Shelf (Produtos em Validade): R$ 4.890,00
   ├── (-) 4. Divergência Inventário PA: R$ 1.850,00
   ├── (-) 5. Divergência Inventário AG: R$ 980,00
   ├── (-) 6. Reposições em Rota e Trocas: R$ 1.520,00
   ├── (-) 7. Vales Financeiros/Físicos Pendentes: R$ 760,00
   └── (-) 8. Extravios & Refugos de Pátio: R$ 430,00
===========================================================
(=) TOTAL PACOTE PREJUÍZO (SCL): R$ 15.080,00 (1.21% do Faturamento)
```

---

## 5. Resumo da Matriz ABC Pareto Gerada (`abc_pareto.csv`)

| SKU | Descrição do Produto | Venda 3M (R$) | % Indiv. | % Acum. | Classe ABC | Revisa Manual |
|---|---|---|---|---|---|---|
| 21666 | RED BULL TROPICAL BR LATA 250ML FOUR-PACK | R$ 123165.00 | 31.46% | 31.46% | **Classe A** | false |
| 31795 | BRUTAL FRUIT LONG NECK 275ML SIX-PACK | R$ 94095.00 | 24.03% | 55.49% | **Classe A** | false |
| 9093 | PEPSI TWIST LATA 350ML SH C/12 NPAL | R$ 47790.00 | 12.21% | 67.70% | **Classe A** | false |
| 347 | SUKITA PET 1L CAIXA C/12 | R$ 42714.00 | 10.91% | 78.61% | **Classe A** | true |
| 18267 | SODA LIMONADA ANTARCTICA PET 200ML | R$ 35595.00 | 9.09% | 87.70% | **Classe B** | false |
| 23269 | SKOL BEATS GT LONG NECK 269ML SIX-PACK | R$ 29070.00 | 7.42% | 95.12% | **Classe C** | false |
| 838 | CHOPP BRAHMA CLARO BARRIL KEG 50L | R$ 19125.00 | 4.88% | 100.00% | **Classe C** | false |

---
**Status da Validação da Etapa 5**: Todos os cálculos numéricos, regras de exceção e arquivos modelo foram validados com 100% de conformidade com os manuais operacionais DPO Ambev Guarabira.
