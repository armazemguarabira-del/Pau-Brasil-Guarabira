import json
import random
from datetime import date, timedelta

# Products catalogue
products = [
  {"cod": 21020, "desc": "BUDWEISER 350ML", "emb": "187 - LATA SLEEK 350ML", "v": 2.65, "tipo": "001 - CERVEJA", "fator": 0.0035},
  {"cod": 13205, "desc": "SKOL LITRINHO", "emb": "131 - GFA VD 300ML", "v": 1.70, "tipo": "001 - CERVEJA", "fator": 0.0030},
  {"cod": 9068, "desc": "SKOL 350ML", "emb": "032 - LATA 355", "v": 2.38, "tipo": "001 - CERVEJA", "fator": 0.0035},
  {"cod": 9069, "desc": "BRAHMA CHOPP 350ML", "emb": "032 - LATA 355", "v": 2.38, "tipo": "001 - CERVEJA", "fator": 0.0035},
  {"cod": 20164, "desc": "SKOL LATA 473 MP", "emb": "038 - LATA 473", "v": 3.12, "tipo": "001 - CERVEJA", "fator": 0.00473},
  {"cod": 21658, "desc": "SPATEN LT 350ML", "emb": "187 - LATA SLEEK 350ML", "v": 3.35, "tipo": "001 - CERVEJA", "fator": 0.0035},
  {"cod": 2349, "desc": "GUARANÁ CHP P2", "emb": "025 - PET 2", "v": 5.64, "tipo": "002 - REFRIGERANTE", "fator": 0.0200},
  {"cod": 504, "desc": "PEPSI P2", "emb": "025 - PET 2", "v": 5.23, "tipo": "002 - REFRIGERANTE", "fator": 0.0200},
  {"cod": 982, "desc": "SKOL 600", "emb": "018 - GARRAFA INTEIRA", "v": 4.45, "tipo": "001 - CERVEJA", "fator": 0.0060},
  {"cod": 26462, "desc": "ORIGINAL 473ML", "emb": "038 - LATA 473", "v": 3.47, "tipo": "001 - CERVEJA", "fator": 0.00473},
  {"cod": 9067, "desc": "AP 350ML", "emb": "032 - LATA 355", "v": 2.13, "tipo": "001 - CERVEJA", "fator": 0.0035},
  {"cod": 22180, "desc": "BUD ZERO LN", "emb": "020 - LONG-NECK", "v": 3.60, "tipo": "001 - CERVEJA", "fator": 0.0033},
  {"cod": 30045, "desc": "RED BULL 473ML C12", "emb": "038 - LATA 473", "v": 8.02, "tipo": "026 - ENERGETICO", "fator": 0.00473},
  {"cod": 9276, "desc": "PEPSI ZERO P2", "emb": "025 - PET 2", "v": 5.22, "tipo": "002 - REFRIGERANTE", "fator": 0.0200},
  {"cod": 503, "desc": "SUKITA P2", "emb": "025 - PET 2", "v": 3.83, "tipo": "002 - REFRIGERANTE", "fator": 0.0200},
  {"cod": 2350, "desc": "SODA P2", "emb": "025 - PET 2", "v": 5.32, "tipo": "002 - REFRIGERANTE", "fator": 0.0200}
]

motivos = [
  {"cod": 539, "motivo": "AVARIA / MOVIMENTAÇÃO", "area": "ARMAZEM"},
  {"cod": 557, "motivo": "DQI", "area": "ENTREGA"},
  {"cod": 575, "motivo": "ESTUFADO", "area": "PUXADA"},
  {"cod": 578, "motivo": "VAZAMENTO", "area": "PUXADA"},
  {"cod": 584, "motivo": "MAL CHEIO", "area": "ARMAZEM"},
  {"cod": 524, "motivo": "FALTA NO PALETE", "area": "ARMAZEM"},
  {"cod": 577, "motivo": "QUEBRADA", "area": "PUXADA"}
]

responsaveis = [
  ("RONILDO", "EMPILHADOR"),
  ("JESSIEL", "AJUDANTE"),
  ("MARIVALDO", "EMPILHADOR"),
  ("VICTOR", "MOTORISTA"),
  ("ALEXANDRE", "CONFERENTE"),
  ("CARLOS", "OPERADOR"),
  (None, None)
]

months_pt = {
  1: "JANEIRO",
  2: "FEVEREIRO",
  3: "MARÇO",
  4: "ABRIL",
  5: "MAIO",
  6: "JUNHO",
  7: "JULHO"
}

# Preserve user specific actual counts for key dates if desired, or generate deterministic rich data
# Key known dates from user image:
# 2026-07-25: 6
# 2026-07-24: 36
# 2026-07-23: 36
# 2026-07-22: 59
# 2026-01-06: 20
# 2026-01-05: 14
# 2026-01-02: 11
# 2026-01-01: 1

known_counts = {
  "2026-07-25": 6,
  "2026-07-24": 36,
  "2026-07-23": 36,
  "2026-07-22": 59,
  "2026-01-06": 20,
  "2026-01-05": 14,
  "2026-01-02": 11,
  "2026-01-01": 1
}

random.seed(42) # Deterministic generation

start_date = date(2026, 1, 1)
end_date = date(2026, 7, 25)

records = []
curr = start_date

while curr <= end_date:
    date_str = curr.strftime("%Y-%m-%d")
    weekday = curr.weekday() # 0 = Mon, 6 = Sun
    
    # Skip Sundays
    if weekday == 6:
        curr += timedelta(days=1)
        continue

    # Determine record count for this day
    if date_str in known_counts:
        count = known_counts[date_str]
    else:
        # Saturdays get fewer records, weekdays get 6-18 records
        if weekday == 5: # Saturday
            count = random.choice([2, 3, 4, 5, 6])
        else:
            count = random.randint(6, 16)
            
    month_name = months_pt[curr.month]
    
    for i in range(count):
        p = products[(i * 7 + curr.day) % len(products)]
        m = motivos[(i * 3 + curr.month) % len(motivos)]
        qty = float(random.choice([1, 2, 3, 4, 5, 6, 8, 10, 12, 18]))
        resp, func = responsaveis[i % len(responsaveis)]
        
        # WQI status
        is_wqi = "SIM" if (i % 9 == 0 and m["area"] == "ENTREGA") else "NÃO"
        
        hl_loss = round(qty * p["fator"], 4)
        total_val = round(qty * p["v"], 2)
        
        records.append({
          "data": date_str,
          "mes": month_name,
          "produtoCodigo": p["cod"],
          "descricao": p["desc"],
          "quantidade": qty,
          "fatorHl": p["fator"],
          "hlPerdido": hl_loss,
          "tipoMarca": p["tipo"],
          "embalagem": p["emb"],
          "turno": "MANHÃ" if i % 2 == 0 else "NOITE",
          "codigo": m["cod"],
          "area": m["area"],
          "motivo": m["motivo"],
          "valorUnitario": p["v"],
          "valorTotal": total_val,
          "responsavel": resp,
          "funcao": func,
          "wqi": is_wqi
        })

    curr += timedelta(days=1)

# Sort records descending by date
records.sort(key=lambda x: x["data"], reverse=True)

with open("/app/applet/src/data/baseQuebrasData.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {len(records)} records from {start_date} to {end_date}.")
