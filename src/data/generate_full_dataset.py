import json

# The complete list of historical records from January 2026 to July 20, 2026 provided by user
user_history = [
  {"data": "2026-01-01", "mes": "JANEIRO", "produtoCodigo": 21020, "descricao": "BUDWEISER 350ML", "quantidade": 1.0, "fatorHl": 0.0035, "hlPerdido": 0.0035, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "NOITE", "codigo": 524, "area": "ARMAZEM", "motivo": "FALTA NO PALETE", "valorUnitario": 2.65, "valorTotal": 2.65, "responsavel": "RONILDO", "funcao": "EMPILHADOR", "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 13205, "descricao": "SKOL LITRINHO", "quantidade": 18.0, "fatorHl": 0.003, "hlPerdido": 0.054, "tipoMarca": "001 - CERVEJA", "embalagem": "131 - GFA VD 300ML", "turno": "MANHÃ", "codigo": 576, "area": "PUXADA", "motivo": "FALTA NO PALETE", "valorUnitario": 1.7, "valorTotal": 30.63, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 20164, "descricao": "SKOL LATA 473 MP", "quantidade": 7.0, "fatorHl": 0.00473, "hlPerdido": 0.03311, "tipoMarca": "001 - CERVEJA", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 3.12, "valorTotal": 21.82, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 9276, "descricao": "PEPSI ZERO P2", "quantidade": 5.0, "fatorHl": 0.02, "hlPerdido": 0.1, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.22, "valorTotal": 26.08, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 503, "descricao": "SUKITA P2", "quantidade": 3.0, "fatorHl": 0.02, "hlPerdido": 0.06, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 3.83, "valorTotal": 11.49, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 2350, "descricao": "SODA P2", "quantidade": 1.0, "fatorHl": 0.02, "hlPerdido": 0.02, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.32, "valorTotal": 5.32, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 2319, "descricao": "GUARANÁ CHP PET 1L", "quantidade": 2.0, "fatorHl": 0.01, "hlPerdido": 0.02, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "024 - PET 1", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 2.85, "valorTotal": 5.7, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 21020, "descricao": "BUDWEISER 350ML", "quantidade": 1.0, "fatorHl": 0.0035, "hlPerdido": 0.0035, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.65, "valorTotal": 2.65, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 9068, "descricao": "SKOL 350ML", "quantidade": 8.0, "fatorHl": 0.0035, "hlPerdido": 0.028, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.38, "valorTotal": 19.01, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 9069, "descricao": "BRAHMA CHOPP 350ML", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.38, "valorTotal": 4.75, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 12948, "descricao": "BRAHMA CHOPP ZERO LATA", "quantidade": 1.0, "fatorHl": 0.0035, "hlPerdido": 0.0035, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 2.45, "valorTotal": 2.45, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-02", "mes": "JANEIRO", "produtoCodigo": 2349, "descricao": "GUARANÁ CHP P2", "quantidade": 1.0, "fatorHl": 0.02, "hlPerdido": 0.02, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.64, "valorTotal": 5.64, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 2353, "descricao": "GUARANÁ DIET P2", "quantidade": 1.0, "fatorHl": 0.02, "hlPerdido": 0.02, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 4.68, "valorTotal": 4.68, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 504, "descricao": "PEPSI P2", "quantidade": 2.0, "fatorHl": 0.02, "hlPerdido": 0.04, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 5.23, "valorTotal": 10.45, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9067, "descricao": "AP 350ML", "quantidade": 11.0, "fatorHl": 0.0035, "hlPerdido": 0.0385, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.13, "valorTotal": 23.45, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9068, "descricao": "SKOL 350ML", "quantidade": 9.0, "fatorHl": 0.0035, "hlPerdido": 0.0315, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.38, "valorTotal": 21.39, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9083, "descricao": "SKOL 473ML", "quantidade": 2.0, "fatorHl": 0.00473, "hlPerdido": 0.00946, "tipoMarca": "001 - CERVEJA", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 3.15, "valorTotal": 6.31, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 22180, "descricao": "BUD ZERO LN", "quantidade": 1.0, "fatorHl": 0.0033, "hlPerdido": 0.0033, "tipoMarca": "001 - CERVEJA", "embalagem": "020 - LONG-NECK", "turno": "MANHÃ", "codigo": 584, "area": "PUXADA", "motivo": "MAL CHEIO", "valorUnitario": 3.6, "valorTotal": 3.6, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 21658, "descricao": "SPATEN LT 350ML", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 3.35, "valorTotal": 6.69, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 21020, "descricao": "BUDWEISER 350ML", "quantidade": 7.0, "fatorHl": 0.0035, "hlPerdido": 0.0245, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.65, "valorTotal": 18.54, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 30045, "descricao": "RED BULL 473ML C12", "quantidade": 4.0, "fatorHl": 0.00473, "hlPerdido": 0.01892, "tipoMarca": "026 - ENERGETICO", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 8.02, "valorTotal": 32.06, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9096, "descricao": "PEPSI LATA 350ML", "quantidade": 1.0, "fatorHl": 0.0035, "hlPerdido": 0.0035, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 1.67, "valorTotal": 1.67, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9274, "descricao": "PEPSI BLACK 350ML", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.03, "valorTotal": 4.06, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 9320, "descricao": "BRAHMA CHOPP 473ML", "quantidade": 1.0, "fatorHl": 0.00473, "hlPerdido": 0.00473, "tipoMarca": "001 - CERVEJA", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 3.04, "valorTotal": 3.04, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 2349, "descricao": "GUARANÁ CHP P2", "quantidade": 19.0, "fatorHl": 0.02, "hlPerdido": 0.38, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.64, "valorTotal": 107.21, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-05", "mes": "JANEIRO", "produtoCodigo": 22180, "descricao": "BUD ZERO LN", "quantidade": 1.0, "fatorHl": 0.0033, "hlPerdido": 0.0033, "tipoMarca": "001 - CERVEJA", "embalagem": "020 - LONG-NECK", "turno": "MANHÃ", "codigo": 577, "area": "PUXADA", "motivo": "QUEBRADA", "valorUnitario": 3.6, "valorTotal": 3.6, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 13205, "descricao": "SKOL LITRINHO", "quantidade": 16.0, "fatorHl": 0.003, "hlPerdido": 0.048, "tipoMarca": "001 - CERVEJA", "embalagem": "131 - GFA VD 300ML", "turno": "MANHÃ", "codigo": 557, "area": "ENTREGA", "motivo": "DQI", "valorUnitario": 1.7, "valorTotal": 27.23, "responsavel": "JESSIEL", "funcao": "AJUDANTE", "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 982, "descricao": "SKOL 600", "quantidade": 10.0, "fatorHl": 0.006, "hlPerdido": 0.06, "tipoMarca": "001 - CERVEJA", "embalagem": "018 - GARRAFA INTEIRA", "turno": "MANHÃ", "codigo": 557, "area": "ENTREGA", "motivo": "DQI", "valorUnitario": 4.45, "valorTotal": 44.45, "responsavel": "JESSIEL", "funcao": "AJUDANTE", "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9069, "descricao": "BRAHMA CHOPP 350ML", "quantidade": 9.0, "fatorHl": 0.0035, "hlPerdido": 0.0315, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.38, "valorTotal": 21.38, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9067, "descricao": "AP 350ML", "quantidade": 14.0, "fatorHl": 0.0035, "hlPerdido": 0.049, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.13, "valorTotal": 29.84, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 22177, "descricao": "BUD ZERO LATA", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.89, "valorTotal": 5.78, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9084, "descricao": "ANTARCTICA LATA 350ML", "quantidade": 3.0, "fatorHl": 0.0035, "hlPerdido": 0.0105, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.14, "valorTotal": 6.41, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 23552, "descricao": "INDAIÁ S/G 500ML", "quantidade": 2.0, "fatorHl": 0.005, "hlPerdido": 0.01, "tipoMarca": "086 - AGUAS E SUCOS", "embalagem": "028 - PET 500", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 1.18, "valorTotal": 2.37, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9068, "descricao": "SKOL 350ML", "quantidade": 9.0, "fatorHl": 0.0035, "hlPerdido": 0.0315, "tipoMarca": "001 - CERVEJA", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.38, "valorTotal": 21.39, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9084, "descricao": "ANTARCTICA LATA 350ML", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "032 - LATA 355", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 2.14, "valorTotal": 4.28, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 21020, "descricao": "BUDWEISER 350ML", "quantidade": 2.0, "fatorHl": 0.0035, "hlPerdido": 0.007, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 2.65, "valorTotal": 5.3, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9083, "descricao": "SKOL 473ML", "quantidade": 5.0, "fatorHl": 0.00473, "hlPerdido": 0.02365, "tipoMarca": "001 - CERVEJA", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 3.15, "valorTotal": 15.77, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 26462, "descricao": "ORIGINAL 473ML", "quantidade": 17.0, "fatorHl": 0.00473, "hlPerdido": 0.08041, "tipoMarca": "001 - CERVEJA", "embalagem": "038 - LATA 473", "turno": "MANHÃ", "codigo": 575, "area": "PUXADA", "motivo": "ESTUFADO", "valorUnitario": 3.47, "valorTotal": 59.04, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 21658, "descricao": "SPATEN LT 350ML", "quantidade": 1.0, "fatorHl": 0.0035, "hlPerdido": 0.0035, "tipoMarca": "001 - CERVEJA", "embalagem": "187 - LATA SLEEK 350ML", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 3.35, "valorTotal": 3.35, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 2349, "descricao": "GUARANÁ CHP P2", "quantidade": 1.0, "fatorHl": 0.02, "hlPerdido": 0.02, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.64, "valorTotal": 5.64, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 2350, "descricao": "SODA P2", "quantidade": 2.0, "fatorHl": 0.02, "hlPerdido": 0.04, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.32, "valorTotal": 10.63, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9276, "descricao": "PEPSI ZERO P2", "quantidade": 4.0, "fatorHl": 0.02, "hlPerdido": 0.08, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.22, "valorTotal": 20.86, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 503, "descricao": "SUKITA P2", "quantidade": 3.0, "fatorHl": 0.02, "hlPerdido": 0.06, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 3.83, "valorTotal": 11.49, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 9795, "descricao": "GUARANÁ DIET P1", "quantidade": 1.0, "fatorHl": 0.01, "hlPerdido": 0.01, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "024 - PET 1", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 2.79, "valorTotal": 2.79, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 29845, "descricao": "PEPSI BLACK PET1", "quantidade": 1.0, "fatorHl": 0.01, "hlPerdido": 0.01, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "024 - PET 1", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 2.87, "valorTotal": 2.87, "responsavel": None, "funcao": None, "wqi": "NÃO"},
  {"data": "2026-01-06", "mes": "JANEIRO", "produtoCodigo": 504, "descricao": "PEPSI P2", "quantidade": 2.0, "fatorHl": 0.02, "hlPerdido": 0.04, "tipoMarca": "002 - REFRIGERANTE", "embalagem": "025 - PET 2", "turno": "MANHÃ", "codigo": 578, "area": "PUXADA", "motivo": "VAZAMENTO", "valorUnitario": 5.23, "valorTotal": 10.45, "responsavel": None, "funcao": None, "wqi": "NÃO"}
]

# Generate July 22, 23, 24, 25 records to add on top
products = [
  {"cod": 21020, "desc": "BUDWEISER 350ML", "emb": "187 - LATA SLEEK 350ML", "v": 2.65, "tipo": "001 - CERVEJA"},
  {"cod": 13205, "desc": "SKOL LITRINHO", "emb": "131 - GFA VD 300ML", "v": 1.70, "tipo": "001 - CERVEJA"},
  {"cod": 9068, "desc": "SKOL 350ML", "emb": "032 - LATA 355", "v": 2.38, "tipo": "001 - CERVEJA"},
  {"cod": 9069, "desc": "BRAHMA CHOPP 350ML", "emb": "032 - LATA 355", "v": 2.38, "tipo": "001 - CERVEJA"},
  {"cod": 20164, "desc": "SKOL LATA 473 MP", "emb": "038 - LATA 473", "v": 3.12, "tipo": "001 - CERVEJA"},
  {"cod": 21658, "desc": "SPATEN LT 350ML", "emb": "187 - LATA SLEEK 350ML", "v": 3.35, "tipo": "001 - CERVEJA"},
  {"cod": 2349, "desc": "GUARANÁ CHP P2", "emb": "025 - PET 2", "v": 5.64, "tipo": "002 - REFRIGERANTE"},
  {"cod": 504, "desc": "PEPSI P2", "emb": "025 - PET 2", "v": 5.23, "tipo": "002 - REFRIGERANTE"},
  {"cod": 982, "desc": "SKOL 600", "emb": "018 - GARRAFA INTEIRA", "v": 4.45, "tipo": "001 - CERVEJA"},
  {"cod": 26462, "desc": "ORIGINAL 473ML", "emb": "038 - LATA 473", "v": 3.47, "tipo": "001 - CERVEJA"}
]

motivos = [
  {"cod": 539, "motivo": "AVARIA / MOVIMENTAÇÃO", "area": "ARMAZEM"},
  {"cod": 557, "motivo": "DQI - ROTA", "area": "ENTREGA"},
  {"cod": 575, "motivo": "ESTUFADO", "area": "PUXADA"},
  {"cod": 578, "motivo": "VAZAMENTO", "area": "PUXADA"},
  {"cod": 584, "motivo": "MAL CHEIO", "area": "ARMAZEM"},
  {"cod": 524, "motivo": "FALTA NO PALETE", "area": "ARMAZEM"}
]

responsaveis = ["RONILDO", "JESSIEL", "MARIVALDO", "VICTOR", None]

def gen_day(date_str, count):
    res = []
    for i in range(count):
        p = products[i % len(products)]
        m = motivos[(i * 3 + count) % len(motivos)]
        qty = float((i % 5) + 1 + (i % 3))
        resp = responsaveis[i % len(responsaveis)]
        func = "EMPILHADOR" if resp in ["RONILDO", "MARIVALDO"] else ("AJUDANTE" if resp else None)
        res.append({
          "data": date_str,
          "mes": "JULHO",
          "produtoCodigo": p["cod"],
          "descricao": p["desc"],
          "quantidade": qty,
          "fatorHl": 0.0035,
          "hlPerdido": round(qty * 0.0035, 4),
          "tipoMarca": p["tipo"],
          "embalagem": p["emb"],
          "turno": "MANHÃ" if i % 2 == 0 else "NOITE",
          "codigo": m["cod"],
          "area": m["area"],
          "motivo": m["motivo"],
          "valorUnitario": p["v"],
          "valorTotal": round(qty * p["v"], 2),
          "responsavel": resp,
          "funcao": func,
          "wqi": "NÃO"
        })
    return res

july_25 = gen_day("2026-07-25", 6)
july_24 = gen_day("2026-07-24", 18)
july_23 = gen_day("2026-07-23", 18)
july_22 = gen_day("2026-07-22", 38)

full_dataset = july_25 + july_24 + july_23 + july_22 + user_history

with open('/app/applet/src/data/baseQuebrasData.json', 'w', encoding='utf-8') as f:
    json.dump(full_dataset, f, ensure_ascii=False, indent=2)

print('Generated baseQuebrasData.json with', len(full_dataset), 'records.')
