export interface BaseSkuData {
  sku: number;
  descricao: string;
  unidade: string;
  embalagem: number;
  qtdPallet: number; // Qtd por pallet em caixas/unidades
  estoqueInicialCaixas: number;
  vendaCaixas: number;
}

export const ABASTECIMENTO_PRODUCTS_DATA: BaseSkuData[] = [
  { sku: 19225, descricao: "RED BULL BR LAT", unidade: "cx", embalagem: 3, qtdPallet: 144, estoqueInicialCaixas: 144, vendaCaixas: 4 },
  { sku: 19229, descricao: "RED BULL BR LAT 250ML", unidade: "cx", embalagem: 3, qtdPallet: 576, estoqueInicialCaixas: 576, vendaCaixas: 29 },
  { sku: 982, descricao: "SKOL 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 672, vendaCaixas: 202 },
  { sku: 988, descricao: "BRAHMA CHOPP 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 504, vendaCaixas: 104 },
  { sku: 2538, descricao: "ANTARCTICA PILSEN 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 1176, vendaCaixas: 272 },
  { sku: 2548, descricao: "BUDWEISER 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 840, vendaCaixas: 120 },
  { sku: 20530, descricao: "STELLA ARTOIS 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 168, vendaCaixas: 22 },
  { sku: 23186, descricao: "SPATEN N 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 252, vendaCaixas: 18 },
  { sku: 33857, descricao: "STELLA ARTOIS PILSEN 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 420, vendaCaixas: 15 },
  { sku: 12951, descricao: "BRAHMA CHOPP ZERO 355ML", unidade: "cx", embalagem: 20, qtdPallet: 84, estoqueInicialCaixas: 84, vendaCaixas: 3 }
];
