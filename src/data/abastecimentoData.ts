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
  { sku: 19225, descricao: "RED BULL BR LAT", unidade: "cx", embalagem: 3, qtdPallet: 144, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 19229, descricao: "RED BULL BR LAT 250ML", unidade: "cx", embalagem: 3, qtdPallet: 576, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 982, descricao: "SKOL 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 988, descricao: "BRAHMA CHOPP 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 2538, descricao: "ANTARCTICA PILSEN 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 2548, descricao: "BUDWEISER 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 20530, descricao: "STELLA ARTOIS 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 23186, descricao: "SPATEN N 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 33857, descricao: "STELLA ARTOIS PILSEN 600ML", unidade: "Dz", embalagem: 18, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 },
  { sku: 12951, descricao: "BRAHMA CHOPP ZERO 355ML", unidade: "cx", embalagem: 20, qtdPallet: 84, estoqueInicialCaixas: 0, vendaCaixas: 0 }
];
