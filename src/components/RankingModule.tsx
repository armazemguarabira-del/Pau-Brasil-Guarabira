import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Award, 
  TrendingUp, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Medal,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Zap,
  Truck,
  Layers3
} from 'lucide-react';
import { Usuario } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { WqiCollaboratorRanking } from './WqiCollaboratorRanking';

export interface ColaboradorRankingItem {
  matricula: string;
  nome: string;
  cargo: string;
  funcaoGroup: 'Operador' | 'Ajudante' | 'Empilhador';
  setor: 'Picking' | 'Repack' | 'Quebras' | 'Despejo' | 'Ressuprimento' | 'Gestão da Capacidade' | 'Recebimento' | 'Montagem' | 'EFC / EFD' | 'FEFO' | 'Política de Estoque' | 'Temperatura' | '5S' | 'Ações';
  supervisor: string;
  resultado: number;
  unidadeMedida: 'cx/h' | 'mov/h' | '%' | 'min/pl' | 'cx' | 'PL/h';
  meta: number;
  percentualMeta: number;
  tendencia?: 'up' | 'down' | 'stable';
  variacaoMetaPct: number;
  statusMeta?: string;
}

// CADASTRO OFICIAL DE COLABORADORES DA UNIDADE GUARABIRA-PB
export const LISTA_COLABORADORES_OFICIAIS = [
  // ADMINISTRATIVO
  { matricula: 'G1163', nome: 'ALECYA CRISTINA FLORENCIO FERREIRA', cargo: 'ADMINISTRATIVO', cpf: '116.288.364-23', turno: 'TARDE', funcaoGroup: 'Operador' as const },
  { matricula: 'G1002', nome: 'DJEANDERSON SOARES DO NASCIMENTO', cargo: 'ADMINISTRATIVO', cpf: '114.071.384-13', turno: 'MANHÃ', funcaoGroup: 'Operador' as const },
  { matricula: 'G1150', nome: 'JOSE GONCALVES DE SOUZA', cargo: 'ADMINISTRATIVO', cpf: '128.791.634-12', turno: 'MANHÃ', funcaoGroup: 'Operador' as const },
  { matricula: 'G1073', nome: 'KATHYEL ROCHA DA SILVA', cargo: 'ADMINISTRATIVO', cpf: '715.236.124-01', turno: 'MANHÃ', funcaoGroup: 'Operador' as const },
  { matricula: 'G1009', nome: 'NIXON HENRIQUE PEREIRA DE ARRUDA', cargo: 'ADMINISTRATIVO', cpf: '121.247.484-83', turno: 'MANHÃ', funcaoGroup: 'Operador' as const },

  // AJUDANTE
  { matricula: 'G1160', nome: 'ADMILTON HERMINIO DOS SANTOS MARCELINO', cargo: 'AJUDANTE', cpf: '042.370.104-57', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1001', nome: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'AJUDANTE', cpf: '106.036.454-96', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1161', nome: 'DIMAS EMANUEL MISSIAS DA SILVA', cargo: 'AJUDANTE', cpf: '014.305.954-85', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1055', nome: 'DIOGENES PEREIRA DA SILVA', cargo: 'AJUDANTE', cpf: '701.931.834-71', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1154', nome: 'EDILSON VIEIRA DA SILVA', cargo: 'AJUDANTE', cpf: '099.129.724-57', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1128', nome: 'ELDENKLEBER MAURICIO DA SILVA', cargo: 'AJUDANTE', cpf: '000.618.854-01', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1145', nome: 'GLADSON LISBOA DOS SANTOS', cargo: 'AJUDANTE', cpf: '017.832.554-63', turno: 'TARDE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1147', nome: 'LUIS ANTONIO FREIRE MOREIRA', cargo: 'AJUDANTE', cpf: '088.770.774-25', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1125', nome: 'NATANAEL LUIZ DA SILVA', cargo: 'AJUDANTE', cpf: '708.229.224-44', turno: 'NOITE', funcaoGroup: 'Ajudante' as const },
  { matricula: 'G1137', nome: 'OZENILDO SOUSA SILVA', cargo: 'AJUDANTE', cpf: '083.601.774-90', turno: 'MANHÃ', funcaoGroup: 'Ajudante' as const },

  // CONFERENTE
  { matricula: 'G1121', nome: 'CICERO MATHEU DE OLIVEIRA SILVA', cargo: 'CONFERENTE', cpf: '148.472.344-99', turno: 'NOITE', funcaoGroup: 'Operador' as const },
  { matricula: 'G1088', nome: 'GILSON ROSA DA SILVA', cargo: 'CONFERENTE', cpf: '125.403.194-40', turno: 'MANHÃ', funcaoGroup: 'Operador' as const },
  { matricula: 'G1022', nome: 'MATEUS HENRIQUE DE SOUZA', cargo: 'CONFERENTE', cpf: '092.118.434-11', turno: 'TARDE', funcaoGroup: 'Operador' as const },

  // EMPILHADOR
  { matricula: 'G1093', nome: 'JOSE RONILDO DA SILVA', cargo: 'EMPILHADOR', cpf: '085.789.634-23', turno: 'TARDE', funcaoGroup: 'Empilhador' as const },
  { matricula: 'G1071', nome: 'MARIVALDO ARTUR ALVES', cargo: 'EMPILHADOR', cpf: '047.471.304-03', turno: 'MANHÃ', funcaoGroup: 'Empilhador' as const },
  { matricula: 'G1013', nome: 'PAULO PEREIRA DA SILVA', cargo: 'EMPILHADOR', cpf: '029.604.844-52', turno: 'NOITE', funcaoGroup: 'Empilhador' as const }
];

// CADASTRO MESTRE ZERADO (Não utilizamos dados fixos/inventados no código)
export const CADASTRO_MESTRE_COLABORADORES: ColaboradorRankingItem[] = [];

interface RankingModuleProps {
  user: Usuario;
  initialSetor?: string;
  onNavigate?: (tabId: string) => void;
}

export default function RankingModule({ user, initialSetor = 'Visão Geral (Metas vs Reais)', onNavigate }: RankingModuleProps) {
  const [activeSetor, setActiveSetor] = useState<string>(initialSetor || 'Visão Geral (Metas vs Reais)');
  const [activeFuncao, setActiveFuncao] = useState<'Todos' | 'Conferente' | 'Ajudante' | 'Empilhador'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const empresaData = useEmpresaData();
  const empresaId = user?.empresaId || 'demo';

  const setoresList = [
    'Visão Geral (Metas vs Reais)',
    'Picking', 
    'Repack', 
    'Quebras', 
    'FEFO',
    'Ressuprimento', 
    'Gestão da Capacidade', 
    'Despejo', 
    'EFC / EFD', 
    'Montagem', 
    'Política de Estoque',
    'Temperatura',
    '5S',
    'WQI (Nível Colaborador)',
    'Ações',
    'Ranking Geral'
  ];

  // ── RECALCULAR / BINDING COM DADOS REAIS DO FIRESTORE/LOCALSTORAGE ──
  const realRecords = useMemo(() => {
    let deletedMatriculas: string[] = [];
    try {
      deletedMatriculas = JSON.parse(localStorage.getItem(`deleted_colaboradores_${empresaId}`) || '[]');
    } catch (e) {
      console.error(e);
    }

    const records: ColaboradorRankingItem[] = [];

    // Helper para obter oficial
    const findOfficial = (name: string) => {
      return LISTA_COLABORADORES_OFICIAIS.find(
        c => c.nome.toLowerCase() === name.toLowerCase() || c.matricula.toLowerCase() === name.toLowerCase()
      );
    };

    // 1. Picking de empresaData.tarefas
    if (empresaData.tarefas && empresaData.tarefas.length > 0) {
      const pickingDone = empresaData.tarefas.filter(t => t.status === 'done' || (t.status as string) === 'concluida');
      if (pickingDone.length > 0) {
        const colabMap: Record<string, { totalCx: number; totalMin: number; nome: string }> = {};
        pickingDone.forEach(t => {
          const name = t.operador || 'Operador';
          if (!colabMap[name]) colabMap[name] = { totalCx: 0, totalMin: 0, nome: name };
          colabMap[name].totalCx += Number((t as any).quantidadePaletes || 1) * 30;
          colabMap[name].totalMin += Number((t as any).tempoExecucao || 15);
        });

        Object.values(colabMap).forEach((val) => {
          const official = findOfficial(val.nome);
          const mat = official ? official.matricula : `M-${val.nome.substring(0, 3).toUpperCase()}`;
          if (deletedMatriculas.includes(mat)) return;

          const hours = Math.max(0.1, val.totalMin / 60);
          const cxH = Math.round(val.totalCx / hours);
          const meta = 130;
          const pct = Math.round((cxH / meta) * 1000) / 10;
          
          records.push({
            matricula: mat,
            nome: official ? official.nome : val.nome,
            cargo: official ? official.cargo : 'Operador de Picking',
            funcaoGroup: official ? official.funcaoGroup : 'Operador',
            supervisor: 'COORDENAÇÃO LOGÍSTICA',
            setor: 'Picking',
            unidadeMedida: 'cx/h',
            meta,
            resultado: cxH,
            percentualMeta: pct,
            variacaoMetaPct: Math.round((pct - 100) * 10) / 10,
            statusMeta: pct >= 100 ? '🟢 DENTRO DA META' : '🔴 FORA DA META'
          });
        });
      }
    }

    // 2. Montagem de localStorage
    try {
      const savedMontagem = localStorage.getItem(`montagem_rows_${empresaId}`);
      if (savedMontagem) {
        const mRows = JSON.parse(savedMontagem);
        if (Array.isArray(mRows) && mRows.length > 0) {
          mRows.forEach((m: any, idx: number) => {
            const name = m.colaborador || `Operador ${idx + 1}`;
            const official = findOfficial(name);
            const mat = m.matricula || (official ? official.matricula : `M-MNT-${idx + 101}`);
            if (deletedMatriculas.includes(mat)) return;

            const res = Number(m.caixasMontadas || m.caixas || 0);
            const pct = Number(m.eficienciaPct || m.eficienciaFasePct || 0);

            if (res > 0 || pct > 0) {
              records.push({
                matricula: mat,
                nome: official ? official.nome : name,
                cargo: official ? official.cargo : 'Operador de Montagem',
                funcaoGroup: official ? official.funcaoGroup : 'Operador',
                supervisor: 'SUPERVISÃO DE TURNO',
                setor: 'Montagem',
                unidadeMedida: 'cx/h',
                meta: 100,
                resultado: res,
                percentualMeta: pct,
                variacaoMetaPct: Math.round((pct - 100) * 10) / 10,
                statusMeta: pct >= 100 ? '🟢 DENTRO DA META' : '🔴 FORA DA META'
              });
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Repack de localStorage
    try {
      const savedRepack = localStorage.getItem(`repack_rows_${empresaId}`);
      if (savedRepack) {
        const rRows = JSON.parse(savedRepack);
        if (Array.isArray(rRows) && rRows.length > 0) {
          rRows.forEach((r: any, idx: number) => {
            const name = r.colaborador || `Operador ${idx + 1}`;
            const official = findOfficial(name);
            const mat = r.matricula || (official ? official.matricula : `M-RPK-${idx + 101}`);
            if (deletedMatriculas.includes(mat)) return;

            const res = Number(r.caixasRepack || r.caixas || 0);
            const pct = Number(r.eficienciaPct || 0);

            if (res > 0 || pct > 0) {
              records.push({
                matricula: mat,
                nome: official ? official.nome : name,
                cargo: official ? official.cargo : 'Auxiliar de Repack',
                funcaoGroup: official ? official.funcaoGroup : 'Ajudante',
                supervisor: 'SUPERVISÃO DE REPACK',
                setor: 'Repack',
                unidadeMedida: 'cx/h',
                meta: 80,
                resultado: res,
                percentualMeta: pct,
                variacaoMetaPct: Math.round((pct - 100) * 10) / 10,
                statusMeta: pct >= 100 ? '🟢 DENTRO DA META' : '🔴 FORA DA META'
              });
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 4. Quebras de empresaData.quebras ou localStorage
    try {
      const quebrasList = empresaData.quebras || JSON.parse(localStorage.getItem(`quebras_records_${empresaId}`) || '[]');
      if (Array.isArray(quebrasList) && quebrasList.length > 0) {
        const colabMap: Record<string, { totalAvaria: number; totalVolume: number; nome: string }> = {};
        quebrasList.forEach((q: any) => {
          const name = q.colaborador || q.responsavel;
          if (name) {
            if (!colabMap[name]) colabMap[name] = { totalAvaria: 0, totalVolume: 0, nome: name };
            colabMap[name].totalAvaria += Number(q.quantidade || q.caixas || 1);
            colabMap[name].totalVolume += Number(q.volumeTotal || 1000);
          }
        });

        Object.values(colabMap).forEach((val) => {
          const official = findOfficial(val.nome);
          const mat = official ? official.matricula : `M-QBR-${val.nome.substring(0, 3).toUpperCase()}`;
          if (deletedMatriculas.includes(mat)) return;

          const pctAvaria = Math.round((val.totalAvaria / Math.max(1, val.totalVolume)) * 10000) / 100;
          const meta = 0.15;
          const atingimento = Math.round((meta / Math.max(0.01, pctAvaria)) * 1000) / 10;

          records.push({
            matricula: mat,
            nome: official ? official.nome : val.nome,
            cargo: official ? official.cargo : 'Operador',
            funcaoGroup: official ? official.funcaoGroup : 'Operador',
            supervisor: 'GESTÃO QUALIDADE',
            setor: 'Quebras',
            unidadeMedida: '%',
            meta,
            resultado: pctAvaria,
            percentualMeta: atingimento,
            variacaoMetaPct: Math.round((100 - atingimento) * 10) / 10,
            statusMeta: pctAvaria <= meta ? '🟢 DENTRO DA META' : '🔴 FORA DA META'
          });
        });
      }
    } catch (e) {
      console.error(e);
    }

    return records;
  }, [empresaData, empresaId]);

  // ── CÁLCULO DA GESTÃO DA CAPACIDADE DE ESTOQUE ──
  const capacidadeEstoqueStats = useMemo(() => {
    const armazemRows = empresaData.armazem || [];
    if (!armazemRows || armazemRows.length === 0) {
      return {
        totalItens: 0,
        ok: 0,
        emFalta: 0,
        emRisco: 0,
        pctOk: 0,
        pctFalta: 0,
        pctRisco: 0,
        somaRiscoEFalta: 0,
        metaAtingida: true,
        hasData: false
      };
    }

    const totalItens = armazemRows.length;
    const emFalta = armazemRows.filter(a => (a as any).quantidade === 0 || a.status === 'Livre').length;
    const emRisco = armazemRows.filter(a => (a as any).quantidade > 0 && (a as any).quantidade < 10).length;
    const ok = Math.max(0, totalItens - emFalta - emRisco);

    const pctOk = Math.round((ok / totalItens) * 1000) / 10;
    const pctFalta = Math.round((emFalta / totalItens) * 1000) / 10;
    const pctRisco = Math.round((emRisco / totalItens) * 1000) / 10;

    const somaRiscoEFalta = pctFalta + pctRisco;
    const metaAtingida = somaRiscoEFalta < 80;

    return {
      totalItens,
      ok,
      emFalta,
      emRisco,
      pctOk,
      pctFalta,
      pctRisco,
      somaRiscoEFalta,
      metaAtingida,
      hasData: true
    };
  }, [empresaData.armazem]);

  // ── RANKING GERAL MULTI-PROCESSO CONSOLIDADO ──
  const rankingGeralConsolidado = useMemo(() => {
    const colabMap: Record<string, {
      matricula: string;
      nome: string;
      cargo: string;
      funcaoGroup: string;
      supervisor: string;
      setores: string[];
      totalPct: number;
      count: number;
    }> = {};

    realRecords.forEach(item => {
      const key = item.matricula || item.nome;
      if (!colabMap[key]) {
        colabMap[key] = {
          matricula: item.matricula,
          nome: item.nome,
          cargo: item.cargo,
          funcaoGroup: item.funcaoGroup,
          supervisor: item.supervisor,
          setores: [],
          totalPct: 0,
          count: 0
        };
      }
      colabMap[key].setores.push(item.setor);
      colabMap[key].totalPct += item.percentualMeta;
      colabMap[key].count += 1;
    });

    const consolidated = Object.values(colabMap).map(c => {
      const avgPct = Math.round((c.totalPct / c.count) * 10) / 10;
      return {
        matricula: c.matricula,
        nome: c.nome,
        cargo: c.cargo,
        funcaoGroup: c.funcaoGroup,
        supervisor: c.supervisor,
        setoresStr: Array.from(new Set(c.setores)).join(', '),
        numProcessos: Array.from(new Set(c.setores)).length,
        percentualMetaConsolidado: avgPct,
        atingiuMeta: avgPct >= 100
      };
    });

    consolidated.sort((a, b) => b.percentualMetaConsolidado - a.percentualMetaConsolidado);
    return consolidated;
  }, [realRecords]);

  // ── MATRIZ DINÂMICA DAS 13 OPERAÇÕES COM DADOS REAIS ──
  const matriz13OperacoesDinamica = useMemo(() => {
    const getResponsaveis = (setorKeywords: string[]) => {
      const match = realRecords
        .filter(r => setorKeywords.some(k => r.setor.toLowerCase().includes(k.toLowerCase())))
        .map(r => r.nome.split(' ').slice(0, 2).join(' '));
      if (match.length > 0) {
        return Array.from(new Set(match)).slice(0, 4).join(', ');
      }
      return 'Sem colaborador vinculado';
    };

    // Calculate real values for each sector where available
    const avgPicking = realRecords.filter(r => r.setor === 'Picking').map(r => r.resultado);
    const hasPicking = avgPicking.length > 0;
    const realPickingVal = hasPicking ? (avgPicking.reduce((a, b) => a + b, 0) / avgPicking.length).toFixed(1) : 'Sem dados no período';

    const avgRepack = realRecords.filter(r => r.setor === 'Repack').map(r => r.resultado);
    const hasRepack = avgRepack.length > 0;
    const realRepackVal = hasRepack ? (avgRepack.reduce((a, b) => a + b, 0) / avgRepack.length).toFixed(1) : 'Sem dados no período';

    const avgQuebras = realRecords.filter(r => r.setor === 'Quebras').map(r => r.resultado);
    const hasQuebras = avgQuebras.length > 0;
    const realQuebrasVal = hasQuebras ? (avgQuebras.reduce((a, b) => a + b, 0) / avgQuebras.length).toFixed(2) : 'Sem dados no período';

    const avgMontagem = realRecords.filter(r => r.setor === 'Montagem').map(r => r.resultado);
    const hasMontagem = avgMontagem.length > 0;
    const realMontagemVal = hasMontagem ? (avgMontagem.reduce((a, b) => a + b, 0) / avgMontagem.length).toFixed(1) : 'Sem dados no período';

    // Calculate Política de Estoque
    const produtos = empresaData.produtos || [];
    let produtosCom6Dias = 0;
    if (produtos.length > 0) {
      produtos.forEach(p => {
        const venda = Number((p as any).vendaMedia || (p as any).vendaMediaDiaria || 0);
        const est = Number((p as any).estoqueAtual || (p as any).quantidade || 0);
        const dias = venda > 0 ? est / venda : 0;
        if (dias >= 6) produtosCom6Dias++;
      });
    }
    const hasPolitica = produtos.length > 0;
    const realPctPolitica = hasPolitica ? Math.round((produtosCom6Dias / produtos.length) * 1000) / 10 : 0;

    return [
      {
        id: 'picking',
        setorTab: 'Picking',
        nome: '1. Picking (Separação Paletes / Caixas)',
        meta: '130.0 cx/h',
        real: hasPicking ? `${realPickingVal} cx/h` : 'Sem dados no período',
        atingimentoPct: hasPicking ? Math.round((Number(realPickingVal) / 130) * 1000) / 10 : 0,
        unidade: 'cx/h',
        responsaveis: getResponsaveis(['Picking']),
        status: !hasPicking ? 'SEM DADOS' : Number(realPickingVal) >= 130 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: hasPicking && Number(realPickingVal) >= 130,
        hasData: hasPicking
      },
      {
        id: 'repack',
        setorTab: 'Repack',
        nome: '2. Repack (Reembalagem e Recuperação)',
        meta: '80.0 cx/h',
        real: hasRepack ? `${realRepackVal} cx/h` : 'Sem dados no período',
        atingimentoPct: hasRepack ? Math.round((Number(realRepackVal) / 80) * 1000) / 10 : 0,
        unidade: 'cx/h',
        responsaveis: getResponsaveis(['Repack']),
        status: !hasRepack ? 'SEM DADOS' : Number(realRepackVal) >= 80 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: hasRepack && Number(realRepackVal) >= 80,
        hasData: hasRepack
      },
      {
        id: 'quebras',
        setorTab: 'Quebras',
        nome: '3. Quebras & Avarias Internas',
        meta: '≤ 0.15%',
        real: hasQuebras ? `${realQuebrasVal}%` : 'Sem dados no período',
        atingimentoPct: hasQuebras ? Math.round((0.15 / Math.max(0.01, Number(realQuebrasVal))) * 1000) / 10 : 0,
        unidade: '% avaria',
        responsaveis: getResponsaveis(['Quebras']),
        status: !hasQuebras ? 'SEM DADOS' : Number(realQuebrasVal) <= 0.15 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: hasQuebras && Number(realQuebrasVal) <= 0.15,
        hasData: hasQuebras
      },
      {
        id: 'fefo',
        setorTab: 'FEFO',
        nome: '4. FEFO & Giro de Validades Críticas',
        meta: '≥ 95.0%',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: '% conformidade',
        responsaveis: getResponsaveis(['FEFO']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'ressuprimento',
        setorTab: 'Ressuprimento',
        nome: '5. Ressuprimento (Apanhe & Transferências)',
        meta: '≤ 20.0 min/PL',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: 'min/PL',
        responsaveis: getResponsaveis(['Ressuprimento']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'capacidade',
        setorTab: 'Gestão da Capacidade',
        nome: '6. Capacidade de Armazenamento (Saúde Estoque)',
        meta: '≥ 85.0% Ok',
        real: capacidadeEstoqueStats.hasData ? `${capacidadeEstoqueStats.pctOk}% Ok` : 'Sem dados no período',
        atingimentoPct: capacidadeEstoqueStats.hasData ? Math.round((capacidadeEstoqueStats.pctOk / 85) * 1000) / 10 : 0,
        unidade: '% ocupação',
        responsaveis: getResponsaveis(['Capacidade', 'Gestão da Capacidade']),
        status: !capacidadeEstoqueStats.hasData ? 'SEM DADOS' : capacidadeEstoqueStats.pctOk >= 80 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: capacidadeEstoqueStats.hasData && capacidadeEstoqueStats.pctOk >= 80,
        hasData: capacidadeEstoqueStats.hasData
      },
      {
        id: 'despejo',
        setorTab: 'Despejo',
        nome: '7. Operação de Despejo',
        meta: '40.0 cx/h',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: 'cx/h',
        responsaveis: getResponsaveis(['Despejo']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'efc_efd',
        setorTab: 'EFC / EFD',
        nome: '8. EFC / EFD (Pontualidade Expedição/Descarregamento)',
        meta: 'EFC ≥ 96% | EFD ≥ 90%',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: '% pontualidade',
        responsaveis: getResponsaveis(['EFC', 'EFD']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'montagem',
        setorTab: 'Montagem',
        nome: '9. Montagem de Paletes',
        meta: '100.0 cx/h',
        real: hasMontagem ? `${realMontagemVal} cx/h` : 'Sem dados no período',
        atingimentoPct: hasMontagem ? Math.round((Number(realMontagemVal) / 100) * 1000) / 10 : 0,
        unidade: 'cx/h',
        responsaveis: getResponsaveis(['Montagem']),
        status: !hasMontagem ? 'SEM DADOS' : Number(realMontagemVal) >= 100 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: hasMontagem && Number(realMontagemVal) >= 100,
        hasData: hasMontagem
      },
      {
        id: 'politica_estoque',
        setorTab: 'Política de Estoque',
        nome: '10. Política de Estoque (80% SKUs com ≥ 6 dias de estoque)',
        meta: '80.0% SKUs',
        real: hasPolitica ? `${realPctPolitica}% SKUs` : 'Sem dados no período',
        atingimentoPct: hasPolitica ? Math.round((realPctPolitica / 80) * 1000) / 10 : 0,
        unidade: '% SKUs conforme',
        responsaveis: getResponsaveis(['Política de Estoque']),
        status: !hasPolitica ? 'SEM DADOS' : realPctPolitica >= 80 ? 'DENTRO DA META' : 'FORA DA META',
        isOk: hasPolitica && realPctPolitica >= 80,
        hasData: hasPolitica
      },
      {
        id: 'temperatura',
        setorTab: 'Temperatura',
        nome: '11. Temperatura Armazém (18°C–28°C)',
        meta: '100.0% conformidade',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: '% e °C',
        responsaveis: getResponsaveis(['Temperatura']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'programa_5s',
        setorTab: '5S',
        nome: '12. Auditoria 5S & Sanitização',
        meta: '≥ 90.0%',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: '% pontuação',
        responsaveis: getResponsaveis(['5S']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      },
      {
        id: 'acoes',
        setorTab: 'Ações',
        nome: '13. Planos de Ação Corretiva & Governança',
        meta: '100.0% no prazo',
        real: 'Sem dados no período',
        atingimentoPct: 0,
        unidade: '% concluídas',
        responsaveis: getResponsaveis(['Ações']),
        status: 'SEM DADOS',
        isOk: false,
        hasData: false
      }
    ];
  }, [realRecords, empresaData, capacidadeEstoqueStats]);

  // Dynamic Summary Stats from 13 operations
  const summaryStats = useMemo(() => {
    const opsComDados = matriz13OperacoesDinamica.filter(op => op.hasData);
    const totalComDados = opsComDados.length;
    const mediaEfic = totalComDados > 0
      ? (opsComDados.reduce((acc, op) => acc + op.atingimentoPct, 0) / totalComDados).toFixed(1) + '%'
      : '—';
    const conformesCount = opsComDados.filter(op => op.isOk).length;
    const acompanhamentoCount = opsComDados.filter(op => !op.isOk).length;

    return {
      totalComDados,
      mediaEfic,
      conformesCount,
      acompanhamentoCount
    };
  }, [matriz13OperacoesDinamica]);

  // ── FILTRAGEM POR SETOR, GRUPO E BUSCA ──
  const filtered = useMemo(() => {
    if (activeSetor === 'Ranking Geral' || activeSetor === 'Gestão da Capacidade' || activeSetor === 'WQI (Nível Colaborador)') {
      return [];
    }

    return realRecords.filter(item => {
      if (item.setor !== activeSetor) return false;
      
      if (activeSetor === 'Picking' && item.funcaoGroup !== 'Operador') return false;
      if (activeSetor === 'EFC / EFD' && item.funcaoGroup !== 'Empilhador') return false;
      if (activeSetor === 'Despejo' && item.funcaoGroup !== 'Ajudante') return false;

      if (activeFuncao !== 'Todos' && item.funcaoGroup !== activeFuncao) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.nome.toLowerCase().includes(q) ||
          item.matricula.toLowerCase().includes(q) ||
          item.cargo.toLowerCase().includes(q) ||
          item.supervisor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [realRecords, activeSetor, activeFuncao, searchTerm]);

  const isQuebras = activeSetor === 'Quebras';
  
  const quebrasEmpilhadores = useMemo(() => {
    if (!isQuebras) return [];
    return realRecords
      .filter(r => r.setor === 'Quebras' && r.funcaoGroup === 'Empilhador')
      .sort((a, b) => a.resultado - b.resultado);
  }, [isQuebras, realRecords]);

  const quebrasAjudantes = useMemo(() => {
    if (!isQuebras) return [];
    return realRecords
      .filter(r => r.setor === 'Quebras' && r.funcaoGroup === 'Ajudante')
      .sort((a, b) => a.resultado - b.resultado);
  }, [isQuebras, realRecords]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.percentualMeta - a.percentualMeta);
  }, [filtered]);

  const topMelhores = sorted.filter(s => s.percentualMeta >= 100);
  const pontosAtencao = sorted.filter(s => s.percentualMeta < 100);

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL DE RANKING */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20 flex items-center gap-1.5 w-max">
            <Trophy className="w-3.5 h-3.5 text-indigo-300" />
            Rankings de Produtividade em Tempo Real (Unidade Guarabira-PB)
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 flex items-center gap-2">
            Ranking de Produtividade Operacional por Processo
          </h2>
          <p className="text-xs text-indigo-200/90 font-medium mt-1 max-w-3xl">
            Dados calculados continuamente a partir de lançamentos reais do Firestore e cadastros da unidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSetor === 'Picking' && onNavigate && (
            <button
              onClick={() => onNavigate('eficiencia-montagem')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
              title="Acessar performance do Fast Picking na plataforma secundária"
            >
              <Zap className="w-4 h-4 text-slate-950" />
              <span>Acessar Fast Picking</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          )}

          <div className="bg-indigo-500/20 border border-indigo-500/40 p-3 rounded-xl flex items-center gap-3 shrink-0">
            <Award className="w-8 h-8 text-indigo-400" />
            <div>
              <span className="text-[9px] text-indigo-300 uppercase font-black block">Base Oficial</span>
              <span className="text-sm font-black text-white">{LISTA_COLABORADORES_OFICIAIS.length} Colaboradores</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE SELEÇÃO DE PROCESSO / SETOR (BARRA DE ROLAGEM VISÍVEL E FLUIDA) */}
      <div className="relative group">
        <div className="flex overflow-x-auto gap-2 pb-2.5 scrollbar-thin scrollbar-thumb-indigo-600/60 scrollbar-track-slate-900/60 border-b border-slate-800">
          {setoresList.map(s => (
            <button
              key={s}
              onClick={() => setActiveSetor(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeSetor === s
                  ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]'
                  : 'bg-[#111a30] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {s === 'Ranking Geral' ? <Trophy className="w-3.5 h-3.5 text-amber-400" /> : <Layers className="w-3.5 h-3.5" />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MATRIZ GERAL DE PRODUTIVIDADE: METAS VS REAIS DE TODAS AS 13 OPERAÇÕES */}
      {/* ==================================================================== */}
      {activeSetor === 'Visão Geral (Metas vs Reais)' && (
        <div className="space-y-6">
          {/* CARDS DE RESUMO GLOBAL DINÂMICOS DE OPERAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111a30] border border-indigo-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Operações Monitoradas</span>
                <strong className="text-2xl text-white font-black">{summaryStats.totalComDados} / 13</strong>
                <span className="text-[10px] text-indigo-400 block font-bold">
                  {summaryStats.totalComDados > 0 ? `${Math.round((summaryStats.totalComDados / 13) * 100)}% com dados reais` : 'Nenhum dado lançado'}
                </span>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Layers3 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Eficiência Média Geral</span>
                <strong className="text-2xl text-emerald-400 font-black">{summaryStats.mediaEfic}</strong>
                <span className="text-[10px] text-emerald-300 block font-bold">média das operações ativas</span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Operações Conformes (OK)</span>
                <strong className="text-2xl text-emerald-400 font-black">{summaryStats.conformesCount} {summaryStats.conformesCount === 1 ? 'Operação' : 'Operações'}</strong>
                <span className="text-[10px] text-emerald-300 block font-bold">dentro ou acima do padrão</span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#111a30] border border-amber-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Acompanhamento & Planos</span>
                <strong className="text-2xl text-amber-400 font-black">{summaryStats.acompanhamentoCount} {summaryStats.acompanhamentoCount === 1 ? 'Operação' : 'Operações'}</strong>
                <span className="text-[10px] text-amber-300 block font-bold">governança e planos ativos</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* TABELA CONSOLIDADA DA MATRIZ DAS 13 OPERAÇÕES */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  QUADRO EXECUTIVO DE PRODUTIVIDADE OPERACIONAL
                </span>
                <h3 className="text-lg font-black text-white mt-1.5 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                  Matriz de Metas e Reais — Todas as 13 Operações Logísticas
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo direto de metas, resultados reais e colaboradores responsáveis designados em cada frente de trabalho.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-bold bg-[#0b1222] px-3 py-1.5 rounded-xl border border-slate-800">
                  Unidade Guarabira-PB
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b1222]">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-[#111a30] border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Operação / Processo</th>
                    <th className="py-3.5 px-3 text-center">Meta Padrão</th>
                    <th className="py-3.5 px-3 text-center">Resultado Real</th>
                    <th className="py-3.5 px-3 text-center">% Atingimento</th>
                    <th className="py-3.5 px-3 text-center">Status Operacional</th>
                    <th className="py-3.5 px-4">Colaboradores Responsáveis</th>
                    <th className="py-3.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {matriz13OperacoesDinamica.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-900/60 transition-colors">
                      {/* OPERAÇÃO */}
                      <td className="py-3.5 px-4 font-black text-white">
                        <span className="block text-xs font-bold text-slate-200">{op.nome}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">{op.unidade}</span>
                      </td>

                      {/* META */}
                      <td className="py-3.5 px-3 text-center font-mono font-extrabold text-indigo-300">
                        {op.meta}
                      </td>

                      {/* REAL */}
                      <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-400 text-sm">
                        {op.real}
                      </td>

                      {/* % ATINGIMENTO */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono font-black text-xs">
                          <span className={op.hasData ? (op.atingimentoPct >= 100 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-500'}>
                            {op.hasData ? `${op.atingimentoPct}%` : '—'}
                          </span>
                        </div>
                        {op.hasData && (
                          <div className="w-20 bg-slate-800 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${op.atingimentoPct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                              style={{ width: `${Math.min(100, op.atingimentoPct)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          !op.hasData
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : op.isOk 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {!op.hasData ? null : op.isOk ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          {op.status}
                        </span>
                      </td>

                      {/* COLABORADORES RESPONSÁVEIS */}
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {op.responsaveis.split(',').map((resp, idx) => (
                            <span key={idx} className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                              👤 {resp.trim()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* AÇÃO */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => {
                            if (setoresList.includes(op.setorTab)) {
                              setActiveSetor(op.setorTab);
                            } else if (onNavigate && (op as any).panelTab) {
                              onNavigate((op as any).panelTab);
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          Ver Detalhes <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CASO ESPECIAL: GESTÃO DA CAPACIDADE DO ESTOQUE (SAÚDE DO ESTOQUE) */}
      {/* ==================================================================== */}
      {activeSetor === 'Gestão da Capacidade' && (
        <div className="space-y-6">
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  INDICADOR DE SAÚDE DO ESTOQUE (CAPACIDADE)
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Gestão da Capacidade — Distribuição de Status dos Itens
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Métrica consolidada do percentual de SKUs OK, em Falta e em Risco de Falta no armazém.
                </p>
              </div>

              {!capacidadeEstoqueStats.metaAtingida && capacidadeEstoqueStats.hasData && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-black flex items-center gap-2.5 max-w-md animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <strong className="block text-rose-200">ALERTA CRÍTICO: META NÃO ATINGIDA!</strong>
                    <span>Falta + Risco somam {capacidadeEstoqueStats.somaRiscoEFalta}% dos itens (limite máximo tolerado: 80%).</span>
                  </div>
                </div>
              )}
            </div>

            {/* CARDS DE PERCENTUAL DE SAÚDE DO ESTOQUE */}
            {!capacidadeEstoqueStats.hasData ? (
              <div className="p-8 bg-[#0b1222] border border-slate-800 rounded-2xl text-center text-slate-400 space-y-2">
                <p className="text-sm font-bold">Nenhum item cadastrado no armazém.</p>
                <p className="text-xs text-slate-500">Cadastre os produtos e posições no módulo de Armazém para visualizar a ocupação e capacidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* ITENS OK */}
                <div className="bg-[#0b1222] border border-emerald-500/30 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      Itens em Situação OK
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <strong className="text-3xl font-black text-emerald-400 font-mono">
                    {capacidadeEstoqueStats.pctOk}%
                  </strong>
                  <span className="text-xs text-slate-400 block font-bold">
                    {capacidadeEstoqueStats.ok} de {capacidadeEstoqueStats.totalItens} SKUs com nível ideal
                  </span>
                </div>

                {/* ITENS EM RISCO DE FALTA */}
                <div className="bg-[#0b1222] border border-amber-500/30 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      Itens em Risco de Falta
                    </span>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <strong className="text-3xl font-black text-amber-400 font-mono">
                    {capacidadeEstoqueStats.pctRisco}%
                  </strong>
                  <span className="text-xs text-slate-400 block font-bold">
                    {capacidadeEstoqueStats.emRisco} SKUs próximos ao ponto crítico de ressuprimento
                  </span>
                </div>

                {/* ITENS EM FALTA (RUPTURA) */}
                <div className="bg-[#0b1222] border border-rose-500/30 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                      Itens em Falta (Ruptura)
                    </span>
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <strong className="text-3xl font-black text-rose-500 font-mono">
                    {capacidadeEstoqueStats.pctFalta}%
                  </strong>
                  <span className="text-xs text-slate-400 block font-bold">
                    {capacidadeEstoqueStats.emFalta} SKUs zerados no estoque
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CASO ESPECIAL: RANKING WQI NÍVEL COLABORADOR (WAREHOUSE QUALITY INDEX) */}
      {/* ==================================================================== */}
      {activeSetor === 'WQI (Nível Colaborador)' && (
        <div className="space-y-6">
          <WqiCollaboratorRanking theme="dark" />
        </div>
      )}

      {/* ==================================================================== */}
      {/* CASO ESPECIAL: RANKING GERAL CONSOLIDADO MULTI-PROCESSO */}
      {/* ==================================================================== */}
      {activeSetor === 'Ranking Geral' && (
        <div className="space-y-6">
          <div className="bg-[#111a30] border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> Ranking Geral Multi-Processo (Consolidado)
                </h3>
                <p className="text-xs text-slate-400">
                  Desempenho consolidado dos colaboradores que atuam em um ou mais processos operacionais.
                </p>
              </div>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                {rankingGeralConsolidado.length} Colaboradores Ranqueados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                    <th className="p-3">Posição</th>
                    <th className="p-3">Matrícula / Colaborador</th>
                    <th className="p-3">Grupo / Cargo</th>
                    <th className="p-3">Processos de Atuação</th>
                    <th className="p-3 text-right">Média % Atingido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                  {rankingGeralConsolidado.map((item, idx) => (
                    <tr key={item.matricula ? `${item.matricula}-${idx}` : idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-black text-sm">
                        {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`}
                      </td>
                      <td className="p-3">
                        <span className="text-indigo-400 font-mono text-[10px] font-bold block">{item.matricula}</span>
                        <strong className="text-white text-xs">{item.nome}</strong>
                        <span className="text-[9px] text-slate-400 block">Sup: {item.supervisor}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-white font-bold block">{item.cargo}</span>
                        <span className="text-[10px] text-slate-400">{item.funcaoGroup}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-indigo-300 font-bold text-[11px] block">{item.setoresStr}</span>
                        <span className="text-[9px] text-slate-400">{item.numProcessos} processo(s)</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                          item.atingiuMeta 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/40 font-extrabold'
                        }`}>
                          {item.percentualMetaConsolidado}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rankingGeralConsolidado.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                        Nenhum lançamento real encontrado para os colaboradores no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CASO ESPECIAL: QUEBRAS (DUAS LISTAS SEPARADAS: EMPILHADORES E AJUDANTES) */}
      {/* ==================================================================== */}
      {isQuebras && (
        <div className="space-y-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Regra de Quebras (Conceito Invertido):</strong> Ranking dividido em duas tabelas estritas (Empilhadores vs Ajudantes). Quanto menor o percentual de quebra, melhor a colocação.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LISTA 1: EMPILHADORES - QUEBRAS */}
            <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" /> Empilhadores — Ranking de Quebras
                </h3>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                  Menor % é Melhor
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Colaborador</th>
                      <th className="p-2.5">Resultado</th>
                      <th className="p-2.5 text-right">Status Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {quebrasEmpilhadores.map((item, idx) => {
                      const atingiu = item.resultado <= item.meta;
                      return (
                        <tr key={item.matricula ? `${item.matricula}-${idx}` : idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-black">{idx + 1}º</td>
                          <td className="p-2.5">
                            <span className="text-indigo-400 font-mono text-[10px] block">{item.matricula}</span>
                            <strong className="text-white">{item.nome}</strong>
                          </td>
                          <td className="p-2.5 font-mono">
                            <span className={atingiu ? 'text-emerald-400 font-bold' : 'text-rose-500 font-extrabold'}>
                              {item.resultado}%
                            </span>
                            <span className="text-[9px] text-slate-500 block">Meta: ≤{item.meta}%</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              atingiu ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-500 font-extrabold border border-rose-500/30'
                            }`}>
                              {atingiu ? '🟢 NO PRAZO' : '🔴 ACIMA DA META'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {quebrasEmpilhadores.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                          Nenhum registro de quebras para Empilhadores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LISTA 2: AJUDANTES - QUEBRAS */}
            <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" /> Ajudantes — Ranking de Quebras
                </h3>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                  Menor % é Melhor
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Colaborador</th>
                      <th className="p-2.5">Resultado</th>
                      <th className="p-2.5 text-right">Status Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {quebrasAjudantes.map((item, idx) => {
                      const atingiu = item.resultado <= item.meta;
                      return (
                        <tr key={item.matricula ? `${item.matricula}-${idx}` : idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-black">{idx + 1}º</td>
                          <td className="p-2.5">
                            <span className="text-indigo-400 font-mono text-[10px] block">{item.matricula}</span>
                            <strong className="text-white">{item.nome}</strong>
                          </td>
                          <td className="p-2.5 font-mono">
                            <span className={atingiu ? 'text-emerald-400 font-bold' : 'text-rose-500 font-extrabold'}>
                              {item.resultado}%
                            </span>
                            <span className="text-[9px] text-slate-500 block">Meta: ≤{item.meta}%</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              atingiu ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-500 font-extrabold border border-rose-500/30'
                            }`}>
                              {atingiu ? '🟢 NO PRAZO' : '🔴 ACIMA DA META'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {quebrasAjudantes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                          Nenhum registro de quebras para Ajudantes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SEÇÃO PADRÃO: TABELAS DE MELHORES E PONTOS DE ATENÇÃO (OUTROS PROCESSOS) */}
      {/* ==================================================================== */}
      {!isQuebras && activeSetor !== 'Gestão da Capacidade' && activeSetor !== 'Ranking Geral' && (
        <>
          {/* FILTRO DE GRUPO DE FUNÇÃO & BUSCA */}
          <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-400" /> Grupo de Função:
              </span>
              {(['Todos', 'Conferente', 'Ajudante', 'Empilhador'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFuncao(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeFuncao === f
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-[#0b1222] text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {f === 'Todos' ? 'Todos os Grupos' : f}
                </button>
              ))}
            </div>

            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Matrícula, Nome, Cargo ou Supervisor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0b1222] border border-slate-700 text-white text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP MELHORES (ATINGINDO A META) */}
            <div className="bg-[#111a30] border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                  <Medal className="w-4 h-4 text-emerald-400" /> Top Melhores — {activeSetor}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Atingiram Meta
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Matrícula / Colaborador</th>
                      <th className="p-2.5">Cargo / Grupo</th>
                      <th className="p-2.5">Resultado vs Meta</th>
                      <th className="p-2.5 text-right">% Atingido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {topMelhores.map((item, idx) => (
                      <tr key={item.matricula ? `${item.matricula}-${idx}` : idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 font-black text-xs">
                          {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`}
                        </td>
                        <td className="p-2.5">
                          <span className="text-indigo-400 font-mono text-[10px] font-bold block">{item.matricula}</span>
                          <strong className="text-white text-xs">{item.nome}</strong>
                          <span className="text-[9px] text-slate-400 block">Sup: {item.supervisor}</span>
                        </td>
                        <td className="p-2.5 text-[11px]">
                          <span>{item.cargo}</span>
                          <span className="text-[9px] text-slate-400 block font-bold">{item.funcaoGroup}</span>
                        </td>
                        <td className="p-2.5 font-mono text-xs">
                          <strong className="text-emerald-400">{item.resultado} {item.unidadeMedida}</strong>
                          <span className="text-[9px] text-slate-400 block">Meta: {item.meta} {item.unidadeMedida}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-400 text-xs">
                          <span>{item.percentualMeta}%</span>
                          <span className="text-[9px] text-emerald-300 font-normal block flex items-center justify-end gap-0.5">
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            +{item.variacaoMetaPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topMelhores.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                          Nenhum registro acima da meta encontrado para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PONTOS DE ATENÇÃO (NÃO ATINGIRAM A META - DESTAQUE EM VERMELHO) */}
            <div className="bg-[#111a30] border border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black uppercase text-rose-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" /> Pontos de Atenção — Fora da Meta
                </h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  Requer Acompanhamento
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b1222] text-slate-400 font-black uppercase text-[9px] border-b border-slate-800">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Matrícula / Colaborador</th>
                      <th className="p-2.5">Cargo / Grupo</th>
                      <th className="p-2.5">Resultado vs Meta</th>
                      <th className="p-2.5 text-right">% Atingido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {pontosAtencao.map((item, idx) => (
                      <tr key={item.matricula ? `${item.matricula}-${idx}` : idx} className="hover:bg-slate-800/30 bg-rose-500/5 transition-colors">
                        <td className="p-2.5 font-black text-xs text-rose-500">
                          {`#${idx + 1}`}
                        </td>
                        <td className="p-2.5">
                          <span className="text-rose-400 font-mono text-[10px] font-bold block">{item.matricula}</span>
                          <strong className="text-white text-xs">{item.nome}</strong>
                          <span className="text-[9px] text-slate-400 block">Sup: {item.supervisor}</span>
                        </td>
                        <td className="p-2.5 text-[11px]">
                          <span>{item.cargo}</span>
                          <span className="text-[9px] text-slate-400 block font-bold">{item.funcaoGroup}</span>
                        </td>
                        <td className="p-2.5 font-mono text-xs">
                          <strong className="text-rose-500 font-black">{item.resultado} {item.unidadeMedida}</strong>
                          <span className="text-[9px] text-slate-400 block">Meta: {item.meta} {item.unidadeMedida}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-xs">
                          <span className="text-rose-500 font-extrabold bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                            {item.percentualMeta}%
                          </span>
                          <span className="text-[9px] text-rose-400 font-bold block flex items-center justify-end gap-0.5 mt-1">
                            <ArrowDownRight className="w-3 h-3 text-rose-500" />
                            {item.variacaoMetaPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pontosAtencao.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                          Nenhum ponto de atenção registrado para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
