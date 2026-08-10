# Especificação de Testes de Aceite (Acceptance Tests) — Etapa 6 (DPO Guarabira-PB)

Este documento descreve os cenários formais de teste de aceite end-to-end, passíveis de execução automatizada ou manual, para validação das regras de negócio críticas do sistema logístico DPO.

---

## 🔬 Cenário 1 — Login Obrigatório e Autenticação Protegida

- **Objetivo**: Garantir que rotas internas do sistema fiquem estritamente bloqueadas até a emissão de um token JWT de sessão ativo.
- **Atores**: Usuário não autenticado / Visitante.
- **Pré-condição**: Navegador sem token armazenado no `localStorage` / sem header `Authorization`.

### Passos de Execução:
1. Acessar a URL direta do sistema `/overview` ou `/future-shelf`.
2. Tentar disparar uma requisição `GET /demandas` via cliente HTTP sem o header `Authorization`.

### Resultado Esperado:
- A interface redireciona imediatamente para a tela de `/login`.
- A API REST responde com código HTTP `401 Unauthorized` e mensagem JSON: `{"error": "Acesso não autorizado. Faça login para continuar."}`.
- O campo de formulário solicita a Matrícula e Senha. Após preenchimento dos dados de Nixon (G1128 / user123), o login é concluído com sucesso e o usuário redirecionado ao Dashboard.

---

## 🔒 Cenário 2 — Inativação de Usuário Bloqueia Acesso Imediatamente

- **Objetivo**: Validar a revogação instantânea de permissões e expulsa do usuário quando o status da conta é alterado para `inativo`.
- **Atores**: Administrador de Acessos / Conferente afetado.
- **Pré-condição**: Colaborador `CARLOS EDUARDO SILVA` (G1199) está logado em uma aba com token JWT válido.

### Passos de Execução:
1. O Administrador acessa o painel 'Controle de Acessos' (TAPA X).
2. Localiza o usuário `CARLOS EDUARDO SILVA` e altera o toggle de status para **Inativo**.
3. O Administrador confirma a ação.
4. Na aba de Carlos Eduardo, tenta-se executar qualquer ação (ex: salvar quantidade no Future Shelf ou navegar de página).

### Resultado Esperado:
- O middleware de autenticação verifica o status atual na tabela `colaboradores` e detecta `status == 'inativo'`.
- A API retorna HTTP `403 Forbidden` com payload `{"error": "Conta inativa. Acesso revogado pelo Administrador."}`.
- O cliente React limpa o `localStorage`, exibe um toast de aviso vermelho e força a saída para a tela de Login.

---

## 📋 Cenário 3 — Checklist de 5S do Ajudante Obrigatório ao Iniciar Jornada

- **Objetivo**: Assegurar a trava de segurança operacional que impede o Ajudante de Armazém de trabalhar antes de concluir o rito de 5S.
- **Atores**: Ajudante de Armazém (ex: `G1150`).
- **Pré-condição**: Usuário com perfil `Ajudante` faz login no início do seu turno.

### Passos de Execução:
1. O Ajudante efetua login na aplicação.
2. A tela exibe o aviso "Jornada Bloqueada — Checklist de 5S Pendente" e abre o modal `ChecklistModal5S`.
3. O ajudante tenta fechar o modal clicando fora ou pressionando `ESC`.
4. O ajudante tenta acessar as rotas de WMS/Escoamento diretamente.
5. O ajudante marca os 5 itens do checklist 5S (1S Utilização, 2S Organização, 3S Limpeza, 4S Padronização, 5S Disciplina) e clica em **"Submeter e Liberar Jornada"**.

### Resultado Esperado:
- Nos passos 3 e 4, a interface impede o fechamento do modal e bloqueia a navegação.
- No passo 5, a API `POST /checklists/submit` responde com `status: 200 OK` e `liberado_para_operacao: true`.
- O modal fecha, o badge no topo altera para "Jornada Liberada (5S Concluído)" e as funcionalidades de trabalho do ajudante são desbloqueadas.

---

## 📝 Cenário 4 — Conferente Atualiza Quantidade Físicamente Contada (Mon–Sáb)

- **Objetivo**: Validar a atualização de saldo no pátio por conferente autorizado dentro da janela de dias úteis (Segunda a Sábado) e o bloqueio no Domingo.
- **Atores**: Conferente de Armazém (`NIXON HENRIQUE PEREIRA DE ARRUDA`).
- **Pré-condição**: Item `a1b2c3d4-0005-4000-8000-000000000005` possui quantidade cadastrada = `36`.

### Passos de Execução:
1. **Teste em Dia Útil (Ex: Quarta-feira)**:
   - Nixon acessa a aba Future Shelf.
   - Localiza o SKU `LIMEIRA` e edita o campo de quantidade física para `38`.
   - Clica em "Salvar Aferição".
2. **Simulação em Domingo**:
   - Forçar a data do sistema para Domingo.
   - Tentar executar a mesma requisição `PATCH /demandas/:id/atualizar-quantidade`.

### Resultado Esperado:
- **No Teste em Dia Útil**: A API retorna `status: 200 OK`, atualiza a quantidade para `38`, registra o nome do conferente `NIXON HENRIQUE PEREIRA DE ARRUDA`, o timestamp atual e a tag `dia_semana: Wed`.
- **Na Simulação de Domingo**: A API recusa a alteração com HTTP `400 Bad Request` e mensagem: `{"error": "Atualização de contagem permitida apenas de Segunda a Sábado."}`.

---

## 📦 Cenário 5 — Registro de Escoamento e Filtro por Stock Age Index (<60)

- **Objetivo**: Verificar a filtragem automática e o processo de escoamento físico para itens de estoque envelhecido ($Stock\ Age\ Index < 0.60$).
- **Atores**: Operador de Escoamento / Mesa de Controle.
- **Pré-condição**: Item SKU 347 (Sukita PET 1L) possui $Stock\ Age\ Index = 0.57$.

### Passos de Execução:
1. Acessar o módulo 'Gestão de Escoamento'.
2. Ativar o filtro por atalho "Apenas Stock Age Index < 60".
3. Localizar o lote `LOT-347-20260925` com quantidade `306` caixas.
4. Clicar em "Registrar Escoamento" e informar a quantidade escoada de `50` caixas.
5. Confirmar a operação.

### Resultado Esperado:
- O filtro do passo 2 exibe o SKU Sukita PET com o rótulo piscante "Alerta de Envelhecimento (0.57)".
- A requisição `POST /escoamento` processa a saída de 50 caixas, ajustando a quantidade restante para `256` caixas.
- A aplicação recalcula a nova previsão de término do lote (`nova_previsao_escoamento`) e grava o registro na tabela `escoamento_registros`.

---

## 📈 Cenário 6 — Fechamento de Ação Corretiva DPO e Recálculo Global de percent_closed

- **Objetivo**: Confirmar o encerramento do ciclo de vida de um plano de ação DPO e a atualização imediata dos indicadores executivos da unidade.
- **Atores**: Coordenador de Armazém / Conferente.
- **Pré-condição**: O indicador `percent_closed` atual da unidade Guarabira é `91.67%` (22 de 24 ações concluídas).

### Passos de Execução:
1. Acessar a aba 'Desvios & Ações DPO'.
2. Selecionar o plano de ação pendente "Substituição de palete avariado no picking 23".
3. Clicar em "Encerrar Plano de Ação", anexar justificativa / evidência e confirmar.

### Resultado Esperado:
- A API `POST /acoes/:id/fechar` altera o status do registro de `PENDENTE` para `CONCLUIDO` e grava a data de encerramento (`concluido_em`).
- O sistema dispara o evento `trigger_fechamento_acao_dpo`.
- O velocímetro executivo DPO no topo da tela é recalculado e salta instantaneamente de `91.67%` para `95.83%` ($\frac{23}{24} \times 100$).
- Uma notificação in-app de confirmação é entregue à Mesa de Controle.
