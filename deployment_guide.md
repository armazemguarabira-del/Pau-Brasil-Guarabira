# Guia de Implantação e Deploy em Produção — Workstation CCO Guarabira

**Versão**: v1.0-TAPA_X  
**Ambiente**: Google Cloud Run / Container Docker / PostgreSQL  

---

## 1. Variáveis de Ambiente Necessárias (`.env`)

```env
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
```

---

## 2. Passos para Build e Deploy no Cloud Run

1. **Compilação do Servidor**:
   `npm run build`
   *(Executa vite build para o frontend e esbuild server.ts gerando dist/server.cjs)*

2. **Inicialização do Serviço**:
   `npm start`
   *(Inicia node dist/server.cjs na porta 3000)*

3. **Configuração de Jobs Cron no Cloud Scheduler**:
   - `job_45dias`: Cron `0 1 * * *` -> Endpoint `POST /internal/jobs/45dias`
   - `job_reset_5s_diario`: Cron `0 5 * * *` -> Endpoint `POST /internal/jobs/reset-5s`
   - `job_recalculo_stock_age`: Cron `0 2 * * *` -> Endpoint `POST /internal/jobs/stock-age`
