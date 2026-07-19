export interface ModuloDef {
  id: string;
  icon: string;
  nome: string;
  cor: string;
  desc: string;
  planoMinimo: 'basico' | 'profissional' | 'completo';
  paneId: string;
}

export const AF_MODULOS: Record<string, ModuloDef> = {
  repack: {
    id:    'repack',
    icon:  '♻️',
    nome:  'Repack',
    cor:   '#f5a623',
    desc:  'Produtividade por colaborador, metas e exportação.',
    planoMinimo: 'basico',
    paneId:   'repack',
  },
  validades: {
    id:    'validades',
    icon:  '📅',
    nome:  'Validades',
    cor:   '#8b5cf6',
    desc:  'Controle FEFO, alertas de vencimento, ações corretivas.',
    planoMinimo: 'basico',
    paneId:   'validades',
  },
  quebras: {
    id:    'quebras',
    icon:  '💥',
    nome:  'Quebras',
    cor:   '#ef4444',
    desc:  'Registro e rastreabilidade de quebras operacionais.',
    planoMinimo: 'profissional',
    paneId:   'quebras',
  },
  despejo: {
    id:    'despejo',
    icon:  '🚮',
    nome:  'Despejo',
    cor:   '#06b6d4',
    desc:  'Controle de refugo descartado com aprovação por nível.',
    planoMinimo: 'profissional',
    paneId:   'despejo',
  },
  empilhador: {
    id:    'empilhador',
    icon:  '📦',
    nome:  'Picking',
    cor:   '#3b82f6',
    desc:  'Rastreamento de tarefas de picking por operador.',
    planoMinimo: 'completo',
    paneId:   'empilhador',
  },
  refugo: {
    id:    'refugo',
    icon:  '🔍',
    nome:  'Blitz de Refugo',
    cor:   '#eab308',
    desc:  'Inspeção de qualidade: 12 defeitos, 3 embalagens, % refugo.',
    planoMinimo: 'completo',
    paneId:   'refugo',
  },
};

export interface PapelDef {
  id: string;
  nome: string;
  cor: string;
  pode: {
    lancarRegistros: boolean;
    verRelatorios: boolean;
    exportarDados: boolean;
    gerenciarUsuarios: boolean;
    alterarModulos: boolean;
    excluirRegistros: boolean;
    acessarPainelAdmin: boolean;
  };
}

export const AF_PAPEIS: Record<string, PapelDef> = {
  admin: {
    id:    'admin',
    nome:  'Administrador',
    cor:   '#f5a623',
    pode: {
      lancarRegistros:    true,
      verRelatorios:      true,
      exportarDados:      true,
      gerenciarUsuarios:  true,
      alterarModulos:     true,
      excluirRegistros:   true,
      acessarPainelAdmin: true,
    },
  },
  supervisor: {
    id:    'supervisor',
    nome:  'Supervisor',
    cor:   '#3b82f6',
    pode: {
      lancarRegistros:    true,
      verRelatorios:      true,
      exportarDados:      true,
      gerenciarUsuarios:  false,
      alterarModulos:     false,
      excluirRegistros:   true,
      acessarPainelAdmin: false,
    },
  },
  operador: {
    id:    'operador',
    nome:  'Operador',
    cor:   '#6a7d92',
    pode: {
      lancarRegistros:    true,
      verRelatorios:      false,
      exportarDados:      false,
      gerenciarUsuarios:  false,
      alterarModulos:     false,
      excluirRegistros:   false,
      acessarPainelAdmin: false,
    },
  },
};

export const PRODUCTS = [
  { codigo: 279, descricao: "BRAHMA CHOPP LONG NECK 355ML SIX-PACK CAIXA C/4" },
  { codigo: 347, descricao: "SUKITA PET 1L CAIXA C/12" },
  { codigo: 503, descricao: "SUKITA PET 2L CAIXA C/6" },
  { codigo: 504, descricao: "PEPSI COLA PET 2L CAIXA C/6" },
  { codigo: 620, descricao: "CARACU LONG NECK 355ML SIX-PACK BANDEJA C/4" },
  { codigo: 772, descricao: "PEPSI COLA MIX BAG IN BOX 18L" },
  { codigo: 838, descricao: "CHOPP BRAHMA CLARO BARRIL KEG 50L" },
  { codigo: 982, descricao: "SKOL 600ML" },
  { codigo: 988, descricao: "BRAHMA CHOPP 600ML" },
  { codigo: 1114, descricao: "GUARANA CHP ANTARCTICA PET 3,3 L SH C/04" },
  { codigo: 1116, descricao: "PEPSI COLA PET 3,3 L SH C/04" },
  { codigo: 1166, descricao: "SUKITA UVA PET 2L CAIXA C/6" },
  { codigo: 1388, descricao: "SKOL GFA VD 1L 2,99" },
  { codigo: 1695, descricao: "BRAHMA CHOPP GFA VD 1L COM TTC" },
  { codigo: 1699, descricao: "STELLA ARTOIS LT 269ML CX C/8 FRIDGE PACK" },
  { codigo: 1743, descricao: "ANTARCTICA PILSEN GFA VD 1L COM TTC" },
  { codigo: 1745, descricao: "SKOL LT 269ML SH C15 NPAL" },
  { codigo: 1898, descricao: "BRAHMA CHOPP LT 269ML SH C15 NPAL" },
  { codigo: 2006, descricao: "ANTARCTICA SUBZERO 600ML" },
  { codigo: 2008, descricao: "ANTARCTICA SUBZERO LATA 350ML SH C/12 NPAL" },
  { codigo: 2243, descricao: "GUARANA CHP ANTARCTICA MIX BAG IN BOX 18L" },
  { codigo: 2248, descricao: "SODA LIMONADA ANTARCTICA MIX BAG IN BOX 18L" },
  { codigo: 2250, descricao: "GUARANA CHP ANTARCTICA DIET MIX BAG IN BOX 18L" },
  { codigo: 2319, descricao: "GUARANA CHP ANTARCTICA PET 1L CAIXA C/12" },
  { codigo: 2320, descricao: "SODA LIMONADA ANTARCTICA PET 1L CAIXA C/12" },
  { codigo: 2349, descricao: "GUARANA CHP ANTARCTICA PET 2L CAIXA C/6" },
  { codigo: 2350, descricao: "SODA LIMONADA ANTARCTICA PET 2L CAIXA C/6" },
  { codigo: 2353, descricao: "GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6" },
  { codigo: 2538, descricao: "ANTARCTICA PILSEN 600ML" },
  { codigo: 2546, descricao: "ORIGINAL 600ML" },
  { codigo: 2548, descricao: "BUDWEISER 600ML" },
  { codigo: 2585, descricao: "GUARANA CHP ANTARCTICA GFA VD 1L" },
  { codigo: 3733, descricao: "BOHEMIA NOVA EMBALAGEM 600ML" },
  { codigo: 3735, descricao: "BOHEMIA NOVA EMBALAGEM LONG NECK 355ML SIX-PACK SHRINK C/4" },
  { codigo: 4141, descricao: "PATAGONIA AMB LAG NACIONAL LT SLEEK 350ML C 8 CX CARTAO" },
  { codigo: 4143, descricao: "PATAGONIA BOH PILS NACIONAL LT SLEEK 350ML C 8 CX CARTAO" },
  { codigo: 4198, descricao: "PATAGONIA IPA LT SLEEK 350ML C 8 CX CARTAO" },
  { codigo: 4262, descricao: "MICHELOB ULTRA N LT SLEEK 350ML C 8 CX CARTAO" },
  { codigo: 4293, descricao: "PEPSI BLACK PET 200ML SH C/12" },
  { codigo: 4409, descricao: "PEPSI TWIST PET 2L SHRINK C/6" },
  { codigo: 6181, descricao: "AGUA MIN DIAS DAVILA S/GAS PET 500ML CAIXA C/12" },
  { codigo: 6183, descricao: "AGUA MIN DIAS DAVILA C/GAS PET 500ML CAIXA C/12" },
  { codigo: 6185, descricao: "AGUA MIN DIAS DAVILA S/GAS PET 1,5L CAIXA C/6" },
  { codigo: 7325, descricao: "PEPSI COLA PET 1L CAIXA C/12" },
  { codigo: 7431, descricao: "SUKITA MIX BAG IN BOX 18L" },
  { codigo: 7945, descricao: "PEPSI COLA PET 2,5L CAIXA C/6" },
  { codigo: 7947, descricao: "GUARANA CHP ANTARCTICA PET 2,5L CAIXA C/6" },
  { codigo: 7977, descricao: "GATORADE UVA PET 500ML SIXPACK" },
  { codigo: 7979, descricao: "GATORADE FRUTAS CITRICAS PET 500ML SIXPACK" },
  { codigo: 7980, descricao: "GATORADE TANGERINA PET 500ML SIXPACK" },
  { codigo: 7981, descricao: "GATORADE LARANJA PET 500ML SIXPACK" },
  { codigo: 7982, descricao: "GATORADE LIMAO PET 500ML SIXPACK" },
  { codigo: 7983, descricao: "GATORADE MORANGO-MARACUJA PET 500ML SIXPACK" },
  { codigo: 7985, descricao: "GATORADE MARACUJA PET 500ML SIXPACK" },
  { codigo: 8336, descricao: "ORIGINAL ONE WAY 600ML CX 12" },
  { codigo: 8791, descricao: "H2OH LIMAO C/GAS PET 500ML CAIXA C/12" },
  { codigo: 8793, descricao: "H2OH LIMAO C/GAS PET 1,5L CAIXA C/6" },
  { codigo: 8919, descricao: "GUARANA CHP ANTARCTICA PET 600ML CX12 NPAL" },
  { codigo: 9067, descricao: "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL" },
  { codigo: 9068, descricao: "SKOL LATA 350ML SH C/12 NPAL" },
  { codigo: 34608, "descricao": "SKOL LATA 350ML SH C/12 NPAL MULTIPACK" },
  { codigo: 9069, descricao: "BRAHMA CHOPP LATA 350ML SH C/12 NPAL" },
  { codigo: 33820, "descricao": "BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK" },
  { codigo: 9072, descricao: "BOHEMIA NOVA EMBALAGEM LATA 350ML SH C/12 NPAL" },
  { codigo: 9083, descricao: "SKOL LT 473ML SH C/12 NPAL" },
  { codigo: 9084, descricao: "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL" },
  { codigo: 20329, "descricao": "BRAHMA DUPLO MALTE 600ML" },
  { codigo: 21632, "descricao": "SPATEN N LN 355ML SIXPACK SH C/4" },
  { codigo: 23186, "descricao": "SPATEN N 600ML" }
];
