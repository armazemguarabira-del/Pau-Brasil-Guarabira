# Plano de Testes de Aceite e Cenários de Validação (Etapa 8) — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Escopo**: Validação de ponta a ponta dos módulos do CCO Armazém Guarabira.

---

## 1. Matriz de Cenários de Teste de Aceite

### Cenário 1: Autenticação JWT e Provisionamento de Roles
- **Pré-condição**: Usuário cadastrado sem role explícita via `POST /users` com cargo "Conferente de Pátio".
- **Passos**:
  1. Realizar chamada `POST /users` com cargo "Conferente de Pátio".
  2. Efetuar login via `POST /auth/login` com a matrícula `GBR-1099`.
- **Resultado Esperado**: O sistema atribui automaticamente a role `Conferente`, retorna o JWT token e libera o acesso aos endpoints permitidos na matriz de autorização.

### Cenário 2: Trava de Atualização de Quantidade (Segunda a Sábado)
- **Pré-condição**: Login como `Conferente`.
- **Passos**:
  1. Executar `PATCH /demandas/dem-001/atualizar-quantidade` no domingo.
  2. Executar a mesma chamada na segunda-feira.
- **Resultado Esperado**: No domingo, a API rejeita com status 403 ("Ajustes de quantidade permitidos apenas de Segunda a Sábado"). Na segunda-feira, a alteração é aceita com código 200 e gera um registro de auditoria na tabela `logs`.

### Cenário 3: Validação de Staging com Rejeição por Excesso de Erros
- **Pré-condição**: Arquivo CSV contendo 12 linhas com erros de formato de data e SKUs não cadastrados.
- **Passos**:
  1. Submeter o arquivo no motor de importação de staging.
- **Resultado Esperado**: O motor interrompe o lote, impede a gravação no banco, retorna o relatório `import_validation_report_template.md` detalhando as inconsistências por linha e informa que a tolerância de 10 erros foi excedida.

### Cenário 4: Disparo do Alerta `item_45dias`
- **Pré-condição**: Lote `LOT-838-20260806` com vencimento em `2026-08-06` na data base `2026-08-05`.
- **Passos**:
  1. Executar o job cron `job_45dias`.
- **Resultado Esperado**: Flag `prazo_45dias_flag` é alterada para `true`, o item é direcionado para a área de Desvios e as notificações In-App Push e E-mail SMTP são enviadas aos Conferentes e à Gestão Executiva.
