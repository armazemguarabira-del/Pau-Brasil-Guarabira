import React, { useState, useEffect } from 'react';
import TemperaturaImportExportBar from './TemperaturaImportExportBar';
import { getStoredTempLogs } from '../utils/tempStorage';
import { 
  ShieldCheck, 
  Thermometer, 
  Bug, 
  Upload, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Flame, 
  TrendingDown, 
  UserCheck, 
  History, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  X,
  Building2,
  Clock,
  Shield,
  FileCheck,
  ClipboardList,
  Bell,
  Filter,
  Award,
  Database
} from 'lucide-react';
import { Usuario, Empresa } from '../types';
import { Checklist5SModal, ImportExport5SModal } from './Checklist5SModal';
import { RondaGsaComponent } from './RondaGsaComponent';
import { OperationalNotificationBell } from './OperationalNotificationBell';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { LISTA_COLABORADORES_OFICIAIS } from './RankingModule';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export interface Area5SOficial {
  id: string;
  area: string;
  responsavel: string;
  observacao: string;
  metaPct: number;
  realPctDefault: number;
}

export const MESES_ANO_5S = [
  { value: '01', label: '01 - Janeiro' },
  { value: '02', label: '02 - Fevereiro' },
  { value: '03', label: '03 - Março' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Maio' },
  { value: '06', label: '06 - Junho' },
  { value: '07', label: '07 - Julho' },
  { value: '08', label: '08 - Agosto' },
  { value: '09', label: '09 - Setembro' },
  { value: '10', label: '10 - Outubro' },
  { value: '11', label: '11 - Novembro' },
  { value: '12', label: '12 - Dezembro' },
];

export const DEFAULT_AREA_RESPONSAVEIS: Record<string, string> = {
  'PICKING': 'DEJEAN SILVA DE OLIVEIRA',
  'ÁREA DE CARREGAMENTO': 'DEJEAN SILVA DE OLIVEIRA',
  'CENTRAL': 'DEJEAN SILVA DE OLIVEIRA',
  'DESPEJO': 'OZENILDO SOUSA SILVA',
  'ÁREA MKT PLACE': 'OZENILDO SOUSA SILVA',
  'PNC': 'GLADSON LISBOA DOS SANTOS',
  'RECICLÁVEIS': 'DEJEAN SILVA DE OLIVEIRA',
  'REFUGO': 'GLADSON LISBOA DOS SANTOS',
  'DEVOLUÇÃO': 'GLADSON LISBOA DOS SANTOS',
  'REPACK': 'OZENILDO SOUSA SILVA',
  'ÁREA DE CARREGAMENTO DA EMPILHADEIRA': 'PAULO PEREIRA DA SILVA',
  'EMPILHADEIRA 2': 'JOSE RONILDO DA SILVA',
  'EMPILHADEIRA 1': 'MARIVALDO ARTUR ALVES',
  'FROTA DA ENTREGA': 'DIOGENES PEREIRA DA SILVA'
};

export const generateInitial5SAudits = (): any[] => {
  const list: any[] = [];
  const areas = [
    'PICKING', 'ÁREA DE CARREGAMENTO', 'CENTRAL', 'DESPEJO', 'ÁREA MKT PLACE',
    'PNC', 'RECICLÁVEIS', 'REFUGO', 'DEVOLUÇÃO', 'REPACK',
    'ÁREA DE CARREGAMENTO DA EMPILHADEIRA', 'EMPILHADEIRA 2', 'EMPILHADEIRA 1', 'FROTA DA ENTREGA'
  ];
  
  for (let m = 1; m <= 8; m++) {
    const monthStr = m < 10 ? `0${m}` : `${m}`;
    const auditDays = [2, 5, 8, 11, 14, 17, 20, 23, 26, 28];
    auditDays.forEach((dayNum, dayIndex) => {
      const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
      const dataISO = `2026-${monthStr}-${dayStr}`;
      const dataFormatted = `${dayStr}/${monthStr}/2026`;

      areas.forEach((areaName, areaIdx) => {
        const respName = DEFAULT_AREA_RESPONSAVEIS[areaName] || 'DEJEAN SILVA DE OLIVEIRA';
        const scoreVal = 8 + ((areaIdx + dayIndex + m) % 3);
        const notaPct = Math.round((scoreVal / 10) * 100);
        const answers = Array(10).fill(true).map((_, i) => i < scoreVal);
        
        list.push({
          id: `seed_5s_${areaName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${dataISO}`,
          dataISO,
          dataFormatted,
          setor: areaName,
          operador: respName,
          liderAuditor: 'Líder de Turno',
          pontos: scoreVal,
          notaPercentual: notaPct,
          respostas: answers,
          observacoesNaoConforme: scoreVal < 10 ? 'Organização de rotina diária realizada conforme padrão.' : '',
          fotoUrl: null,
          createdAt: new Date().toISOString(),
          empresaId: 'demo'
        });
      });
    });
  }
  return list;
};

export const LISTA_5S_OFICIAL: Area5SOficial[] = [
  { id: '1', area: 'PICKING', responsavel: 'DEJEAN SILVA DE OLIVEIRA', observacao: 'Principais atividades de separação', metaPct: 80, realPctDefault: 85 },
  { id: '2', area: 'ÁREA DE CARREGAMENTO', responsavel: 'DEJEAN SILVA DE OLIVEIRA', observacao: 'Doca e pátio de carregamento', metaPct: 80, realPctDefault: 82 },
  { id: '3', area: 'CENTRAL', responsavel: 'DEJEAN SILVA DE OLIVEIRA', observacao: 'Estoque central de rotatividade', metaPct: 80, realPctDefault: 90 },
  { id: '4', area: 'DESPEJO', responsavel: 'OZENILDO SOUSA SILVA', observacao: 'Área de descarte e triagem', metaPct: 80, realPctDefault: 88 },
  { id: '5', area: 'ÁREA MKT PLACE', responsavel: 'OZENILDO SOUSA SILVA', observacao: 'Mercado Livre / Vendas diretas', metaPct: 80, realPctDefault: 76 },
  { id: '6', area: 'PNC', responsavel: 'GLADSON LISBOA DOS SANTOS', observacao: 'Segregação de Não Conformes', metaPct: 80, realPctDefault: 84 },
  { id: '7', area: 'RECICLÁVEIS', responsavel: 'DEJEAN SILVA DE OLIVEIRA', observacao: 'Prensa e enfardamento de papelão', metaPct: 80, realPctDefault: 86 },
  { id: '8', area: 'REFUGO', responsavel: 'GLADSON LISBOA DOS SANTOS', observacao: 'Avaria e descarte de cacos', metaPct: 80, realPctDefault: 72 },
  { id: '9', area: 'DEVOLUÇÃO', responsavel: 'GLADSON LISBOA DOS SANTOS', observacao: 'Conferência de retornáveis', metaPct: 80, realPctDefault: 83 },
  { id: '10', area: 'REPACK', responsavel: 'OZENILDO SOUSA SILVA', observacao: 'Reembalagem e montagem de pacotes', metaPct: 80, realPctDefault: 92 },
  { id: '11', area: 'ÁREA DE CARREGAMENTO DA EMPILHADEIRA', responsavel: 'PAULO PEREIRA DA SILVA', observacao: 'Baterias e movimentação', metaPct: 80, realPctDefault: 85 },
  { id: '12', area: 'EMPILHADEIRA 2', responsavel: 'JOSE RONILDO DA SILVA', observacao: 'Operação da Empilhadeira 02', metaPct: 80, realPctDefault: 95 },
  { id: '13', area: 'EMPILHADEIRA 1', responsavel: 'MARIVALDO ARTUR ALVES', observacao: 'Operação da Empilhadeira 01', metaPct: 80, realPctDefault: 88 },
  { id: '14', area: 'FROTA DA ENTREGA', responsavel: 'DIOGENES PEREIRA DA SILVA', observacao: 'Estacionamento e baús de entrega', metaPct: 80, realPctDefault: 81 }
];

export interface ArmazemTemperaturaLog {
  id: string;
  dataISO: string;
  dataFormatted: string;
  mesAno: string;
  hora: string;
  temperatura: number;
  umidade: number;
  setor: string;
  conferenteNome: string;
  observacao?: string;
  alertaCritico: boolean;
}

export interface LaudoFileItem {
  fileName: string;
  fileDataUrl?: string;
}

export interface LaudoPragas {
  id: string;
  numeroCertificado: string;
  empresaEspecializada: string;
  responsavelTecnico: string;
  dataExecucao: string;
  dataVencimento: string;
  observacoes: string;
  fileName: string;
  fileDataUrl?: string;
  arquivos?: LaudoFileItem[];
  uploadBy: string;
  criadoEm: string;
}

const generateInitialTempLogs = (): ArmazemTemperaturaLog[] => {
  const list: ArmazemTemperaturaLog[] = [];
  const conferentes = ['Carlos Silva (Conferente)', 'Marcos Vinícius (Conferente)', 'José Fernandes (Conferente)'];
  
  // July 2026 (07/2026 - Mês Vigente)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dataISO = `2026-07-${dayStr}`;
    const dataFormatted = `${dayStr}/07/2026`;
    
    let temp = 24.5 + Math.sin(day * 0.7) * 2.2 + (day % 3 === 0 ? 0.8 : 0);
    temp = Number(temp.toFixed(1));
    let obs = 'Medição de rotina realizada em conformidade com o POP-LOG-015.';
    let alerta = false;

    if (day === 18) {
      temp = 28.7;
      obs = '⚠️ ELEVAÇÃO TÉRMICA: Pico de calor externo às 14h. Portão lateral mantido aberto para descarga de carreta.';
      alerta = true;
    } else if (day === 25) {
      temp = 28.3;
      obs = '⚠️ ALERTA DE TEMPERATURA: Registro levemente acima de 28°C. Exaustores acionados.';
      alerta = true;
    }

    list.push({
      id: `temp-2026-07-${dayStr}`,
      dataISO,
      dataFormatted,
      mesAno: '07/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: Math.round(55 + Math.cos(day) * 5),
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: obs,
      alertaCritico: alerta
    });
  }

  // June 2026 (06/2026)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    let temp = 25.0 + Math.cos(day * 0.5) * 1.8;
    temp = Number(temp.toFixed(1));
    let alerta = false;
    let obs = 'Aferição diária no horário padrão (14:00).';
    if (day === 12) {
      temp = 28.5;
      alerta = true;
      obs = '⚠️ Registro > 28°C no meio do mês de Junho.';
    }

    list.push({
      id: `temp-2026-06-${dayStr}`,
      dataISO: `2026-06-${dayStr}`,
      dataFormatted: `${dayStr}/06/2026`,
      mesAno: '06/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: Math.round(58 + Math.sin(day) * 4),
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: obs,
      alertaCritico: alerta
    });
  }

  // May 2026 (05/2026)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    let temp = 24.2 + Math.sin(day * 0.3) * 1.5;
    temp = Number(temp.toFixed(1));

    list.push({
      id: `temp-2026-05-${dayStr}`,
      dataISO: `2026-05-${dayStr}`,
      dataFormatted: `${dayStr}/05/2026`,
      mesAno: '05/2026',
      hora: '14:00',
      temperatura: temp,
      umidade: 56,
      setor: 'Armazém Central (Guarabira)',
      conferenteNome: conferentes[day % conferentes.length],
      observacao: 'Medição diária em conformidade - maio/2026.',
      alertaCritico: false
    });
  }

  return list;
};

interface QualidadePanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'dark' | 'light';
}

export default function QualidadePanel({ user, empresa, theme = 'dark' }: QualidadePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'temperatura' | '5s' | 'pragas' | 'ronda_gsa'>('temperatura');

  // ── 5S AUDIT & RESPONSIBLES STATE ──
  const currentDate = new Date();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(currentDate.getFullYear());

  const [selectedMonth5S, setSelectedMonth5S] = useState<string>(currentMonthStr);
  const [selectedYear5S, setSelectedYear5S] = useState<string>('2026');

  // Mapeamento de Responsáveis por Área Conectados com o Cadastro de Colaboradores & Workstation
  const [areaResponsaveis, setAreaResponsaveis] = useState<Record<string, string>>(() => {
    try {
      const savedWorkstation = localStorage.getItem('workstation_5s_responsaveis');
      if (savedWorkstation) {
        const parsed: any[] = JSON.parse(savedWorkstation);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map: Record<string, string> = {};
          parsed.forEach(item => {
            if (item.area && item.responsavel) {
              map[item.area] = item.responsavel;
            }
          });
          return { ...DEFAULT_AREA_RESPONSAVEIS, ...map };
        }
      }
      const savedOld = localStorage.getItem('5s_area_responsables_guarabira');
      if (savedOld) return JSON.parse(savedOld);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AREA_RESPONSAVEIS;
  });

  useEffect(() => {
    const syncResponsaveis = () => {
      try {
        const savedWorkstation = localStorage.getItem('workstation_5s_responsaveis');
        if (savedWorkstation) {
          const parsed: any[] = JSON.parse(savedWorkstation);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map: Record<string, string> = {};
            parsed.forEach(item => {
              if (item.area && item.responsavel) {
                map[item.area] = item.responsavel;
              }
            });
            setAreaResponsaveis({ ...DEFAULT_AREA_RESPONSAVEIS, ...map });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener('5s_responsaveis_updated', syncResponsaveis);
    window.addEventListener('storage', syncResponsaveis);
    return () => {
      window.removeEventListener('5s_responsaveis_updated', syncResponsaveis);
      window.removeEventListener('storage', syncResponsaveis);
    };
  }, []);

  const handleUpdateAreaResponsavel = (areaName: string, newCollaboratorName: string) => {
    const updatedMap = { ...areaResponsaveis, [areaName]: newCollaboratorName };
    setAreaResponsaveis(updatedMap);
    try {
      localStorage.setItem('5s_area_responsables_guarabira', JSON.stringify(updatedMap));
      
      const savedWorkstation = localStorage.getItem('workstation_5s_responsaveis');
      let workstationList: any[] = savedWorkstation ? JSON.parse(savedWorkstation) : [];
      if (!Array.isArray(workstationList) || workstationList.length === 0) {
        workstationList = Object.entries(DEFAULT_AREA_RESPONSAVEIS).map(([area, resp], i) => ({
          id: `${i + 1}`,
          area,
          responsavel: resp,
          cargoResponsavel: 'AJUDANTE',
          observacao: 'Principal Responsável',
          metaPct: 80
        }));
      }

      const officialMatch = LISTA_COLABORADORES_OFICIAIS.find(c => c.nome === newCollaboratorName);
      const itemIndex = workstationList.findIndex(w => w.area === areaName);
      if (itemIndex >= 0) {
        workstationList[itemIndex] = {
          ...workstationList[itemIndex],
          responsavel: newCollaboratorName,
          cargoResponsavel: officialMatch ? officialMatch.cargo : 'AJUDANTE'
        };
      } else {
        workstationList.push({
          id: `area-${Date.now()}`,
          area: areaName,
          responsavel: newCollaboratorName,
          cargoResponsavel: officialMatch ? officialMatch.cargo : 'AJUDANTE',
          observacao: 'Principal Responsável',
          metaPct: 80
        });
      }

      localStorage.setItem('workstation_5s_responsaveis', JSON.stringify(workstationList));
      window.dispatchEvent(new Event('5s_responsaveis_updated'));
    } catch (e) {
      console.error(e);
    }
  };

  const [filter5SMode, setFilter5SMode] = useState<'todos' | 'atingiram' | 'fora'>('todos');
  const [is5SModalOpen, setIs5SModalOpen] = useState(false);
  const [is5SImportModalOpen, setIs5SImportModalOpen] = useState(false);
  const [selected5SSetor, setSelected5SSetor] = useState('PICKING');
  const [audits5S, setAudits5S] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('af_5s_audits') || localStorage.getItem('5s_audits_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const seeded = generateInitial5SAudits();
      localStorage.setItem('5s_audits_history', JSON.stringify(seeded));
      localStorage.setItem('af_5s_audits', JSON.stringify(seeded));
      return seeded;
    } catch {
      return generateInitial5SAudits();
    }
  });

  const reloadAudits = () => {
    try {
      const saved = localStorage.getItem('af_5s_audits') || localStorage.getItem('5s_audits_history');
      if (saved) setAudits5S(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.addEventListener('5s_audit_updated', reloadAudits);
    window.addEventListener('5s_responsaveis_updated', reloadAudits);
    window.addEventListener('storage', reloadAudits);
    return () => {
      window.removeEventListener('5s_audit_updated', reloadAudits);
      window.removeEventListener('5s_responsaveis_updated', reloadAudits);
      window.removeEventListener('storage', reloadAudits);
    };
  }, []);

  // Auditorias do Mês e Ano Selecionados
  const filtered5SAuditsMonth = React.useMemo(() => {
    return audits5S.filter(a => {
      if (!a.dataISO) return false;
      const parts = a.dataISO.split('-');
      if (parts.length < 2) return false;
      const y = parts[0];
      const m = parts[1];
      return y === selectedYear5S && m === selectedMonth5S;
    });
  }, [audits5S, selectedMonth5S, selectedYear5S]);

  // Estatísticas de Meta vs Real por Colaborador do Cadastro
  const collaborator5SStats = React.useMemo(() => {
    return LISTA_COLABORADORES_OFICIAIS.map(colab => {
      const assignedAreas = Object.entries(areaResponsaveis)
        .filter(([_, respName]) => {
          if (!respName) return false;
          const normResp = respName.toLowerCase().trim();
          const normColab = colab.nome.toLowerCase().trim();
          const firstName = normColab.split(' ')[0];
          return normResp === normColab || normResp.includes(normColab) || normColab.includes(normResp) || normResp.includes(firstName);
        })
        .map(([areaName]) => areaName);

      const numAreas = assignedAreas.length;
      // Meta diária por mês (22 dias úteis por área sob responsabilidade)
      const metaQtd = numAreas > 0 ? numAreas * 22 : 0;

      const colabAudits = filtered5SAuditsMonth.filter(a => {
        const isOperator = a.operador && (
          a.operador.toLowerCase().trim() === colab.nome.toLowerCase().trim() ||
          colab.nome.toLowerCase().includes(a.operador.toLowerCase().trim())
        );
        const isArea = assignedAreas.some(area => (a.setor || '').toLowerCase().trim() === area.toLowerCase().trim());
        return isOperator || isArea;
      });

      const realQtd = colabAudits.length;
      const isExempt = numAreas === 0 && realQtd === 0;

      const pctQtdAtingimento = isExempt ? 100 : (metaQtd > 0 ? Math.min(100, Math.round((realQtd / metaQtd) * 100)) : 0);

      const avgQuality = realQtd > 0
        ? Math.round(colabAudits.reduce((acc, curr) => acc + (curr.notaPercentual || 0), 0) / realQtd)
        : (numAreas > 0 ? 82 : 0);

      const metaQualidade = 80;
      const notaFinal = isExempt ? 0 : Math.round(avgQuality * (0.5 + 0.5 * (pctQtdAtingimento / 100)));
      const atingiu = isExempt ? true : notaFinal >= metaQualidade;

      const firstName = colab.nome.split(' ')[0];
      const secondName = colab.nome.split(' ')[1] ? colab.nome.split(' ')[1][0] + '.' : '';
      const shortName = `${firstName} ${secondName}`.trim();

      return {
        matricula: colab.matricula,
        nome: colab.nome,
        shortName,
        cargo: colab.cargo,
        assignedAreas,
        numAreas,
        metaQtd,
        realQtd,
        pctQtdAtingimento,
        metaQualidade,
        realQualidade: avgQuality,
        notaFinal,
        atingiu,
        isExempt
      };
    });
  }, [areaResponsaveis, filtered5SAuditsMonth]);

  // ── TEMPERATURE STATE ──
  const [activeTempTab, setActiveTempTab] = useState<'vigente' | 'retroativo'>('vigente');
  
  // Dynamic Month / Year Filter for Temperature
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<string>(currentMonthStr);
  const [selectedFilterYear, setSelectedFilterYear] = useState<string>(currentYearStr);
  const [selectedRetroactiveMonth, setSelectedRetroactiveMonth] = useState<string>(`${currentMonthStr}/${currentYearStr}`);
  const [selectedTempDayId, setSelectedTempDayId] = useState<string | null>(null);

  const [tempLogs, setTempLogs] = useState<ArmazemTemperaturaLog[]>(() => {
    return getStoredTempLogs();
  });

  const handleRefreshTempLogs = () => {
    const logs = getStoredTempLogs();
    setTempLogs(logs);
    if (logs.length > 0) {
      const topLog = logs[0];
      if (topLog && topLog.mesAno) {
        const [m, y] = topLog.mesAno.split('/');
        if (m && y) {
          setSelectedFilterMonth(m);
          setSelectedFilterYear(y);
        }
      }
    }
  };

  useEffect(() => {
    const syncTemp = () => {
      setTempLogs(getStoredTempLogs());
    };
    window.addEventListener('armazem_temp_logs_updated', syncTemp);
    window.addEventListener('storage', syncTemp);
    return () => {
      window.removeEventListener('armazem_temp_logs_updated', syncTemp);
      window.removeEventListener('storage', syncTemp);
    };
  }, []);

  // Conferente Form inputs (3 fixed mandatory schedules: 09:00, 16:00, 22:00)
  const [newTempData, setNewTempData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTempHora, setNewTempHora] = useState<'09:00' | '16:00' | '22:00' | string>('09:00');
  const [newTempValor, setNewTempValor] = useState<string>('');
  const [newTempUmidade, setNewTempUmidade] = useState<string>('58');
  const [newTempSetor, setNewTempSetor] = useState<string>('Armazém Central');
  const [newTempConferente, setNewTempConferente] = useState<string>(user?.nome || 'Conferente Responsável');
  const [newTempObs, setNewTempObs] = useState<string>('');
  const [showConferenteForm, setShowConferenteForm] = useState<boolean>(false);

  // Function to create action plan if temperature is out of range (> 28.0°C or < 18.0°C)
  const createAutoActionPlan = (dataFormatted: string, hora: string, tempNum: number, conferenteNome: string) => {
    try {
      const existingActions = JSON.parse(localStorage.getItem('repack_action_plans') || '[]');
      const newAction = {
        id: `act-temp-${Date.now()}`,
        codigo: `ACT-TEMP-${Math.floor(1000 + Math.random() * 9000)}`,
        data: dataFormatted,
        unb: 'PAU BRASIL GUARABIRA',
        tipoInfracao: 'Desvio de Temperatura do Armazém',
        setor: 'Qualidade / Armazém',
        desvio: `Aferição de temperatura às ${hora} indicou ${tempNum}°C (Fora do limite seguro de 18°C a 28°C).`,
        porQue1: 'Aumento da temperatura ambiente do armazém ou exposição a calor excessivo.',
        porQue2: 'Fluxo de ventilação insuficiente ou portas de carregamento abertas.',
        porQue3: 'Pico de temperatura externa no horário.',
        porQue4: 'Necessidade de acionamento de exaustores / climatizadores.',
        porQue5: 'Ausência de barreira térmica temporária.',
        acaoCorretiva: `Acionar climatização/exaustão imediatamente e reavaliar estoque sensível em 30 min. Registrado por ${conferenteNome}.`,
        responsavel: `Supervisor de Qualidade / ${conferenteNome}`,
        prazo: dataFormatted,
        status: 'EM ANDAMENTO',
        origem: 'Qualidade - Temperatura',
        criadoEm: new Date().toISOString()
      };

      const updatedActions = [newAction, ...existingActions];
      localStorage.setItem('repack_action_plans', JSON.stringify(updatedActions));

      if (db) {
        setDoc(doc(db, 'acoes', newAction.id), newAction).catch(err => console.warn('Firestore action error:', err));
      }
    } catch (err) {
      console.warn('Error generating auto action plan:', err);
    }
  };

  const handleSaveTemperatureRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const tempNum = parseFloat(newTempValor);
    if (isNaN(tempNum)) {
      alert('Por favor, informe um valor de temperatura válido em °C.');
      return;
    }

    const umidNum = parseInt(newTempUmidade, 10) || 55;
    const parts = newTempData.split('-');
    const dataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;
    const isAlerta = tempNum > 28.0 || tempNum < 18.0;

    const newEntry: ArmazemTemperaturaLog = {
      id: `temp-${newTempData}-${newTempHora.replace(':', '')}`,
      dataISO: newTempData,
      dataFormatted,
      mesAno,
      hora: newTempHora || '09:00',
      temperatura: tempNum,
      umidade: umidNum,
      setor: newTempSetor || 'Armazém Central',
      conferenteNome: newTempConferente.trim() || 'Conferente Responsável',
      observacao: newTempObs.trim() || (isAlerta ? `⚠️ ALERTA DE TEMPERATURA FORA DO PADRÃO (${tempNum}°C)` : 'Medição diária registrada com sucesso'),
      alertaCritico: isAlerta
    };

    // Rule: OVERWRITE if log with same dataISO + hora already exists!
    const filteredOut = tempLogs.filter(l => !(l.dataISO === newTempData && l.hora === newTempHora));
    const updated = [newEntry, ...filteredOut];

    // Sort by date desc and time desc
    updated.sort((a, b) => {
      const dateDiff = new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.hora.localeCompare(a.hora);
    });

    setTempLogs(updated);
    localStorage.setItem('armazem_temperatura_logs', JSON.stringify(updated));

    // Auto-generate action plan if temperature is critical
    if (isAlerta) {
      createAutoActionPlan(dataFormatted, newTempHora, tempNum, newEntry.conferenteNome);
    }

    setNewTempValor('');
    setNewTempObs('');
    setShowConferenteForm(false);
    
    alert(`✅ Medição das ${newTempHora} (${tempNum}°C) salva/sobrescrita com sucesso por ${newEntry.conferenteNome}!${isAlerta ? ' ⚠️ ALERTA CRÍTICO: Plano de Ação Corretiva gerado no Quadro de Governança!' : ''}`);
  };

  // ── CONTROLE QUINZENAL DE PRAGAS (PDF) STATE ──
  const [laudosPragas, setLaudosPragas] = useState<LaudoPragas[]>(() => {
    try {
      const saved = localStorage.getItem('controle_pragas_laudos');
      if (saved) return JSON.parse(saved);
      // Initial sample record for Guarabira
      const initial: LaudoPragas[] = [{
        id: 'pragas-2026-07-15',
        numeroCertificado: 'CERT-PRAGAS-2026/014',
        empresaEspecializada: 'IMUNIZADORA & DEDETIZADORA GUARABIRA LTDA',
        responsavelTecnico: 'Dr. Fernando Arcoverde (CRQ 04412/PB)',
        dataExecucao: '2026-07-15',
        dataVencimento: '2026-07-30',
        observacoes: 'Aplicação de gel para baratas e iscagem externa de roedores nos perímetros 1 a 4 do armazém. Sem indícios de pragas ativas.',
        fileName: 'Controle_Quinzenal_Pragas_Julho_2026.pdf',
        uploadBy: user?.nome || 'Controle de Qualidade',
        criadoEm: '2026-07-15T08:30:00.000Z'
      }];
      localStorage.setItem('controle_pragas_laudos', JSON.stringify(initial));
      return initial;
    } catch {
      return [];
    }
  });

  const [showPragasModal, setShowPragasModal] = useState(false);
  const [selectedPragasMonth, setSelectedPragasMonth] = useState<string>('todos');
  const [numCertificado, setNumCertificado] = useState('');
  const [empresaEspecializada, setEmpresaEspecializada] = useState('');
  const [respTecnico, setRespTecnico] = useState('');
  const [dataExecucaoPragas, setDataExecucaoPragas] = useState(new Date().toISOString().split('T')[0]);
  const [dataVencimentoPragas, setDataVencimentoPragas] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [obsPragas, setObsPragas] = useState('');
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<{ fileName: string; fileDataUrl: string; size?: string }[]>([]);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newItems: { fileName: string; fileDataUrl: string; size?: string }[] = [];
      let readCount = 0;

      filesArray.forEach((file) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg');
        
        if (!isPdf) {
          alert(`O arquivo ${file.name} não é um PDF ou documento válido.`);
          return;
        }

        const sizeInKb = (file.size / 1024).toFixed(0) + ' KB';
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newItems.push({
              fileName: file.name,
              fileDataUrl: event.target.result as string,
              size: sizeInKb
            });
          }
          readCount++;
          if (readCount === filesArray.length) {
            setSelectedPdfFiles((prev) => [...prev, ...newItems]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const handleRemovePdfFile = (index: number) => {
    setSelectedPdfFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePragasLaudo = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPdfFiles.length === 0) {
      alert('Por favor, selecione pelo menos 1 arquivo PDF para o Laudo Quinzenal de Pragas.');
      return;
    }

    const firstFile = selectedPdfFiles[0];
    const summaryFileName = selectedPdfFiles.length === 1 
      ? firstFile.fileName 
      : `${selectedPdfFiles.length} Arquivos Anexados (${firstFile.fileName}, ...)`;

    const newLaudo: LaudoPragas = {
      id: `praga-${Date.now()}`,
      numeroCertificado: numCertificado.trim() || `CERT-${Date.now().toString().slice(-6)}`,
      empresaEspecializada: empresaEspecializada.trim() || 'Empresa Especializada em Controle de Vetores',
      responsavelTecnico: respTecnico.trim() || 'Responsável Técnico Habilitado',
      dataExecucao: dataExecucaoPragas,
      dataVencimento: dataVencimentoPragas,
      observacoes: obsPragas.trim() || 'Certificado de dedetização e desratização quinzenal em conformidade com as normas sanitárias.',
      fileName: summaryFileName,
      fileDataUrl: firstFile.fileDataUrl,
      arquivos: selectedPdfFiles.map(f => ({ fileName: f.fileName, fileDataUrl: f.fileDataUrl })),
      uploadBy: user?.nome || 'Operador Responsável',
      criadoEm: new Date().toISOString()
    };

    const updated = [newLaudo, ...laudosPragas];
    setLaudosPragas(updated);
    localStorage.setItem('controle_pragas_laudos', JSON.stringify(updated));

    // Reset Form
    setShowPragasModal(false);
    setNumCertificado('');
    setEmpresaEspecializada('');
    setRespTecnico('');
    setObsPragas('');
    setSelectedPdfFiles([]);

    alert(`✅ Laudo Quinzenal de Pragas (${selectedPdfFiles.length} arquivo(s)) importado com sucesso!`);
  };

  const handleDeletePragasLaudo = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este laudo de pragas?')) {
      const updated = laudosPragas.filter(l => l.id !== id);
      setLaudosPragas(updated);
      localStorage.setItem('controle_pragas_laudos', JSON.stringify(updated));
    }
  };

  // Status calculation for Pest Control Certificate
  const getPestStatus = (dataVencimento: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const venc = new Date(dataVencimento);
    venc.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { label: '❌ VENCIDO - REQUER NOVA APLICAÇÃO', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', bgCard: 'border-rose-500/50' };
    } else if (diffDays <= 3) {
      return { label: `⚠️ PRÓXIMO DO VENCIMENTO (${diffDays} DIA(S))`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', bgCard: 'border-amber-500/50' };
    } else {
      return { label: `✅ VÁLIDO (${diffDays} DIAS RESTANTES)`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', bgCard: 'border-emerald-500/30' };
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* 5S AUDIT MODAL */}
      <Checklist5SModal 
        isOpen={is5SModalOpen}
        onClose={() => setIs5SModalOpen(false)}
        defaultSetor={selected5SSetor}
        userNombre={user?.nome}
      />

      {/* HEADER PRINCIPAL DE QUALIDADE */}
      <div className="bg-[#111a30] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> PAINEL DE QUALIDADE & CONFORMIDADE OPERACIONAL
              </span>
              <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md">
                Unidade Guarabira - PB
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Gestão de Qualidade do Armazém
              <OperationalNotificationBell user={user} userRole="qualidade" onNavigate={(panel, tab) => { if (tab) setActiveSubTab(tab as any); }} />
            </h1>
            
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Centralização dos pilares de auditoria e segurança operacional: <strong>Controle Diário de Temperatura</strong>, <strong>Programa 5S dos 14 Locais</strong> e <strong>Controle Quinzenal de Pragas e Vetores (Laudos PDF)</strong>.
            </p>
          </div>

          {/* KPI CARDS RESUMO DE QUALIDADE */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0b1222] border border-cyan-500/30 rounded-xl p-3 text-center space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Temp. Média</span>
              <span className="text-base font-mono font-black text-cyan-400">25.1°C</span>
              <span className="text-[9px] text-emerald-400 block font-bold">≤ 28.0°C Meta</span>
            </div>

            <div className="bg-[#0b1222] border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Meta 5S (14 Locais)</span>
              <span className="text-base font-mono font-black text-amber-400">84.8%</span>
              <span className="text-[9px] text-amber-300 block font-bold">Meta 80% Atingida</span>
            </div>

            <div className="bg-[#0b1222] border border-emerald-500/30 rounded-xl p-3 text-center space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Laudo Pragas</span>
              <span className="text-xs font-black text-emerald-400 uppercase block mt-1">Conforme</span>
              <span className="text-[9px] text-slate-400 block font-bold">Quinzenal PDF</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS DE QUALIDADE */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('temperatura')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'temperatura'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Thermometer className="w-4 h-4" /> 1. Controle de Temperatura do Armazém
          </button>

          <button
            onClick={() => setActiveSubTab('5s')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === '5s'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> 2. Programa 5S & Desempenho por Área (14 Locais)
          </button>

          <button
            onClick={() => setActiveSubTab('pragas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'pragas'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bug className="w-4 h-4" /> 3. Controle Quinzenal de Pragas (Importação PDF)
          </button>

          <button
            onClick={() => setActiveSubTab('ronda_gsa')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'ronda_gsa'
                ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/20'
                : 'bg-[#0b1222] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-blue-400" /> 4. Ronda de Qualidade Semanal GSA
          </button>
        </div>
      </div>

      {/* ── SEÇÃO 1: CONTROLE DE TEMPERATURA ── */}
      {activeSubTab === 'temperatura' && (
        <div className="bg-[#111a30] border border-cyan-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
          {/* Import / Export / Clear Bar */}
          <TemperaturaImportExportBar onDataChanged={handleRefreshTempLogs} />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-cyan-400" /> CONTROLE TÉRMICO E CLIMATIZAÇÃO (GUARABIRA)
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  3 Horários Obrigatórios: 09:00, 16:00 e 22:00 (Faixa: 18°C a 28°C)
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-2 flex items-center gap-2">
                Monitoramento Diário de Temperatura do Armazém
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Aferição obrigatória realizada pelo Conferente nos 3 horários fixos. O alerta do horário apaga automaticamente ao registrar e exibe o nome do conferente.
              </p>
            </div>

            {/* SELETOR DE FILTRO DE MÊS E ANO + REGISTRO */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#0b1222] border border-slate-800 p-1.5 rounded-xl flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-cyan-400 ml-1" />
                
                {/* Select Mês */}
                <select
                  value={selectedFilterMonth}
                  onChange={(e) => setSelectedFilterMonth(e.target.value)}
                  className="bg-[#111a30] text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 outline-none focus:border-cyan-400"
                >
                  <option value="01">Jan (01)</option>
                  <option value="02">Fev (02)</option>
                  <option value="03">Mar (03)</option>
                  <option value="04">Abr (04)</option>
                  <option value="05">Mai (05)</option>
                  <option value="06">Jun (06)</option>
                  <option value="07">Jul (07)</option>
                  <option value="08">Ago (08)</option>
                  <option value="09">Set (09)</option>
                  <option value="10">Out (10)</option>
                  <option value="11">Nov (11)</option>
                  <option value="12">Dez (12)</option>
                </select>

                {/* Select Ano */}
                <select
                  value={selectedFilterYear}
                  onChange={(e) => setSelectedFilterYear(e.target.value)}
                  className="bg-[#111a30] text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 outline-none focus:border-cyan-400"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              {/* BOTAO PARA CONFERENTE REGISTRAR */}
              <button
                onClick={() => setShowConferenteForm(!showConferenteForm)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <UserCheck className="w-4 h-4 text-emerald-200" />
                {showConferenteForm ? 'Fechar Formularização' : '+ Lançar Medição (Conferente)'}
              </button>
            </div>
          </div>

          {/* PAINEL DE 3 HORÁRIOS FIXOS OBRIGATÓRIOS DO DIA ATUAL */}
          {(() => {
            const todayISO = new Date().toISOString().split('T')[0];
            const todayFormatted = new Date().toLocaleDateString('pt-BR');
            const todayLogs = tempLogs.filter(l => l.dataISO === todayISO);

            const slots = [
              { time: '09:00', label: '1ª Medição Manhã' },
              { time: '16:00', label: '2ª Medição Tarde' },
              { time: '22:00', label: '3ª Medição Noite' }
            ];

            return (
              <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase text-white tracking-wider">
                      Status das 3 Aferições Obrigatórias de Hoje ({todayFormatted})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    O alerta do horário apaga automaticamente ao realizar a medição.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {slots.map(s => {
                    const log = todayLogs.find(l => l.hora === s.time);

                    if (log) {
                      return (
                        <div key={s.time} className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <strong className="text-xs font-black text-white font-mono">{s.time}</strong>
                              <span className="text-[10px] text-emerald-300 font-bold">({s.label})</span>
                            </div>
                            <span className="text-[11px] text-slate-300 block mt-1">
                              Conferente: <strong className="text-white">{log.conferenteNome}</strong>
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-base font-mono font-black ${log.temperatura > 28 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {log.temperatura}°C
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={s.time} className="p-3 bg-rose-950/30 border-2 border-rose-500/60 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <strong className="text-xs font-black text-rose-300 font-mono">{s.time}</strong>
                            <span className="text-[10px] text-rose-300 font-bold">({s.label})</span>
                          </div>
                          <span className="text-[10px] font-black uppercase text-rose-200 block mt-1">
                            ⚠️ MEDIÇÃO PENDENTE DE AFERIÇÃO
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setNewTempData(todayISO);
                            setNewTempHora(s.time);
                            setShowConferenteForm(true);
                          }}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow"
                        >
                          Lançar {s.time}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ALERTA DE TEMPERATURA CRÍTICA (> 28°C) NO MÊS VIGENTE SE HOUVER */}
          {activeTempTab === 'vigente' && (() => {
            const currentMonthLogs = tempLogs.filter(l => l.mesAno === '07/2026');
            const criticalLogs = currentMonthLogs.filter(l => l.temperatura > 28.0);
            if (criticalLogs.length === 0) return null;

            return (
              <div className="p-4 bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl">
                    <AlertOctagon className="w-7 h-7 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-rose-300 bg-rose-500/30 px-2.5 py-0.5 rounded-md">
                        ⚠️ ALERTA DE TEMPERATURA CRÍTICA DETECTADA
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-200">
                        {criticalLogs.length} Ocorrência(s) em Julho/2026
                      </span>
                    </div>
                    <p className="text-xs text-rose-100 font-bold mt-1">
                      Foram registradas temperaturas superiores a <strong className="text-white underline">28.0°C</strong>.
                      A maior temperatura anotada foi de <strong className="text-rose-300 text-sm font-mono">{Math.max(...criticalLogs.map(c => c.temperatura))}°C</strong> no dia <strong className="text-white">{criticalLogs[0].dataFormatted}</strong> por {criticalLogs[0].conferenteNome}.
                    </p>
                    {criticalLogs[0].observacao && (
                      <p className="text-[11px] text-rose-200/90 italic mt-0.5">
                        Obs do Conferente: "{criticalLogs[0].observacao}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-rose-500/30 border border-rose-400/40 rounded-xl text-[11px] font-black uppercase text-rose-200 whitespace-nowrap">
                  Ação: Inspecionar Climatização & Ventilação
                </div>
              </div>
            );
          })()}

          {/* FORMULARIO DE REGISTRO EXCLUSIVO DO CONFERENTE */}
          {showConferenteForm && (
            <form onSubmit={handleSaveTemperatureRecord} className="bg-[#0b1222] border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Painel do Conferente - Registro Diário de Temperatura do Armazém
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  Data Atual: {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Data da Medição</label>
                  <input
                    type="date"
                    value={newTempData}
                    onChange={(e) => setNewTempData(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Horário Obrigatório *</label>
                  <select
                    value={newTempHora}
                    onChange={(e) => setNewTempHora(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="09:00">09:00 (Manhã)</option>
                    <option value="16:00">16:00 (Tarde)</option>
                    <option value="22:00">22:00 (Noite)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Temperatura (°C) <span className="text-rose-400 font-black">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 26.5"
                      value={newTempValor}
                      onChange={(e) => setNewTempValor(e.target.value)}
                      className={`w-full bg-[#111a30] border rounded-xl px-3 py-2 text-xs font-mono font-black text-white focus:outline-none ${
                        parseFloat(newTempValor) > 28.0 ? 'border-rose-500 text-rose-300' : 'border-slate-700 focus:border-emerald-500'
                      }`}
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">°C</span>
                  </div>
                  {parseFloat(newTempValor) > 28.0 && (
                    <span className="text-[10px] text-rose-400 font-bold mt-1 block">
                      ⚠️ Alerta: Valor acima de 28.0°C!
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Conferente Responsável</label>
                  <input
                    type="text"
                    value={newTempConferente}
                    onChange={(e) => setNewTempConferente(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Observações Operacionais</label>
                  <input
                    type="text"
                    value={newTempObs}
                    onChange={(e) => setNewTempObs(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: Condição de portas, clima externo..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConferenteForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Salvar Medição Oficial
                </button>
              </div>
            </form>
          )}

          {/* TAB RETROATIVO SELETOR DE MESES */}
          {activeTempTab === 'retroativo' && (
            <div className="p-4 bg-[#0b1222] border border-indigo-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-indigo-400" />
                <div>
                  <strong className="text-xs text-white uppercase font-black block">Selecione o Mês Retroativo</strong>
                  <span className="text-[11px] text-slate-400">Consulte temperaturas, gráficos e ocorrências registradas em meses anteriores.</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: 'Junho / 2026', value: '06/2026' },
                  { label: 'Maio / 2026', value: '05/2026' }
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setSelectedRetroactiveMonth(m.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      selectedRetroactiveMonth === m.value
                        ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md'
                        : 'bg-[#111a30] text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CARDS DE RESUMO DO MÊS ATIVO */}
          {(() => {
            const targetMonth = `${selectedFilterMonth}/${selectedFilterYear}`;
            const monthLogs = tempLogs
              .filter(l => l.mesAno === targetMonth)
              .sort((a, b) => {
                const timeA = (a.hora || '00:00').length === 4 ? `0${a.hora}` : (a.hora || '00:00');
                const timeB = (b.hora || '00:00').length === 4 ? `0${b.hora}` : (b.hora || '00:00');
                const keyA = `${a.dataISO || '0000-00-00'}T${timeA}`;
                const keyB = `${b.dataISO || '0000-00-00'}T${timeB}`;
                return keyB.localeCompare(keyA);
              });
            const totalDays = monthLogs.length;
            const avgTemp = totalDays > 0 ? (monthLogs.reduce((acc, curr) => acc + curr.temperatura, 0) / totalDays).toFixed(1) : '0.0';
            const maxTemp = totalDays > 0 ? Math.max(...monthLogs.map(l => l.temperatura)).toFixed(1) : '0.0';
            const minTemp = totalDays > 0 ? Math.min(...monthLogs.map(l => l.temperatura)).toFixed(1) : '0.0';
            const alertsCount = monthLogs.filter(l => l.temperatura > 28.0).length;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Média Térmica ({targetMonth})</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-mono font-black text-cyan-400">{avgTemp}°C</span>
                      <Thermometer className="w-5 h-5 text-cyan-500/60" />
                    </div>
                  </div>

                  <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Pico Máximo Registrado</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-mono font-black ${parseFloat(maxTemp) > 28.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {maxTemp}°C
                      </span>
                      <Flame className={`w-5 h-5 ${parseFloat(maxTemp) > 28.0 ? 'text-rose-400' : 'text-emerald-500/60'}`} />
                    </div>
                  </div>

                  <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Mínima Aferida</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-mono font-black text-indigo-400">{minTemp}°C</span>
                      <TrendingDown className="w-5 h-5 text-indigo-400/60" />
                    </div>
                  </div>

                  <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Alertas (&gt; 28°C)</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-mono font-black ${alertsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {alertsCount}
                      </span>
                      <AlertOctagon className={`w-5 h-5 ${alertsCount > 0 ? 'text-rose-400' : 'text-emerald-400/60'}`} />
                    </div>
                  </div>
                </div>

                {/* GRAFICO INTERATIVO DE VARIACAO DIARIA DE TEMPERATURA */}
                <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <strong className="text-xs font-black text-white uppercase block">
                        Gráfico de Variação Diária da Temperatura ({targetMonth})
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        Clique em qualquer ponto do gráfico para ver a aferição completa do Conferente.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-cyan-400 font-bold">
                        <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full inline-block"></span> Medição (°C)
                      </span>
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <span className="w-3 h-0.5 bg-rose-500 rounded-full inline-block"></span> Limite (28.0°C)
                      </span>
                    </div>
                  </div>

                  {/* VISUAL SVG LINE CHART */}
                  <div className="w-full overflow-x-auto pt-2">
                    <div className="min-w-[650px] h-48 relative flex items-end justify-between px-4 pb-6 pt-4 border-b border-slate-800">
                      {/* Threshold 28°C line */}
                      <div 
                        className="absolute left-0 right-0 border-b-2 border-dashed border-rose-500/80 z-10 flex items-center justify-end pr-2"
                        style={{ bottom: `${((28.0 - 20) / 12) * 100}%` }}
                      >
                        <span className="text-[9px] font-black text-rose-400 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-500/40">
                          LIMITE CRÍTICO 28.0°C
                        </span>
                      </div>

                      {monthLogs.map((log) => {
                        const heightPct = Math.max(5, Math.min(95, ((log.temperatura - 20) / 12) * 100));
                        const isSelected = selectedTempDayId === log.id;
                        const isCritical = log.temperatura > 28.0;

                        return (
                          <div
                            key={log.id}
                            onClick={() => setSelectedTempDayId(isSelected ? null : log.id)}
                            className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative z-20"
                          >
                            {/* Tooltip on Hover / Selected */}
                            <div className={`absolute -top-12 bg-slate-900 border ${isCritical ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-slate-200'} px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg ${isSelected ? 'opacity-100 border-cyan-400' : ''}`}>
                              <strong>{log.dataFormatted.substring(0, 5)}</strong>: {log.temperatura}°C ({log.hora})
                            </div>

                            {/* Node point */}
                            <div
                              className={`w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center ${
                                isCritical
                                  ? 'bg-rose-500 border-white shadow-lg shadow-rose-500/50 scale-125'
                                  : isSelected
                                  ? 'bg-cyan-400 border-white scale-125'
                                  : 'bg-[#111a30] border-cyan-400 group-hover:bg-cyan-400'
                              }`}
                              style={{ marginBottom: `${heightPct}%` }}
                            />

                            {/* Day label */}
                            <span className="text-[9px] font-mono text-slate-500 absolute -bottom-5">
                              {log.dataFormatted.substring(0, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DETALHES DO DIA SELECIONADO NO GRÁFICO */}
                  {selectedTempDayId && (() => {
                    const detailLog = monthLogs.find(l => l.id === selectedTempDayId);
                    if (!detailLog) return null;

                    return (
                      <div className="p-4 bg-[#111a30] border border-cyan-500/40 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <strong className="text-white font-mono flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cyan-400" /> Detalhes da Aferição de {detailLog.dataFormatted} às {detailLog.hora}
                          </strong>
                          <span className={`px-2 py-0.5 rounded font-mono font-black ${detailLog.temperatura > 28 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {detailLog.temperatura}°C
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-slate-300">
                          <div><span className="text-slate-500">Conferente:</span> <strong>{detailLog.conferenteNome}</strong></div>
                        </div>
                        {detailLog.observacao && (
                          <p className="text-[11px] text-slate-400 italic bg-[#0b1222] p-2 rounded-lg border border-slate-800">
                            "{detailLog.observacao}"
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* TABELA REGISTRO COMPLETO DO MÊS */}
                <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#131d38] border-b border-slate-800 flex items-center justify-between">
                    <strong className="text-xs text-white uppercase tracking-wider font-black flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" /> Registros Aferidos do Mês ({targetMonth})
                    </strong>
                    <span className="text-[10px] text-slate-400">Total: {monthLogs.length} Aferições</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#0b1222] text-slate-400 text-[10px] uppercase border-b border-slate-800 font-black">
                          <th className="p-3">Data / Hora</th>
                          <th className="p-3">Temperatura (°C)</th>
                          <th className="p-3">Conferente</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                        {monthLogs.map((log) => {
                          const isCrit = log.temperatura > 28.0;
                          return (
                            <tr key={log.id} className={`hover:bg-slate-800/40 transition-colors ${isCrit ? 'bg-rose-950/20' : ''}`}>
                              <td className="p-3 font-bold text-white whitespace-nowrap">
                                {log.dataFormatted} <span className="text-slate-500 text-[10px]">({log.hora})</span>
                              </td>
                              <td className="p-3 font-black text-sm">
                                <span className={`px-2 py-0.5 rounded ${isCrit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono' : 'text-cyan-300'}`}>
                                  {log.temperatura.toFixed(1)}°C
                                </span>
                              </td>
                              <td className="p-3 text-slate-200 font-sans font-bold">{log.conferenteNome}</td>
                              <td className="p-3">
                                {isCrit ? (
                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase rounded border border-rose-500/40">
                                    ⚠️ ALERTA &gt; 28°C
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase rounded border border-emerald-500/40">
                                    ✅ CONFORME
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-[10px] text-slate-400 font-sans truncate max-w-[200px]">
                                {log.observacao || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SEÇÃO 2: PROGRAMA 5S & DESEMPENHO POR ÁREA ── */}
      {activeSubTab === '5s' && (
        <div className="bg-[#111a30] border border-amber-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
          {/* HEADER & FILTRO DE MÊS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  PROGRAMA 5S & ROTINA DIÁRIA (GUARABIRA-PB)
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md">
                  14 Locais Mapeados
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> Programa 5S - Desempenho Diário por Colaborador & Área
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Acompanhamento das auditorias diárias do 5S, cumprimento da frequência (Meta vs Real) e nível de qualidade das áreas.
              </p>
            </div>

            {/* SELETOR DE MÊS E ANO + AÇÕES */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#0b1222] border border-amber-500/30 p-1.5 rounded-xl flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400 ml-1" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 hidden sm:inline">
                  Mês/Ano:
                </span>
                <select
                  value={selectedMonth5S}
                  onChange={(e) => setSelectedMonth5S(e.target.value)}
                  className="bg-[#111a30] text-amber-300 text-xs font-black px-2 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer"
                >
                  {MESES_ANO_5S.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={selectedYear5S}
                  onChange={(e) => setSelectedYear5S(e.target.value)}
                  className="bg-[#111a30] text-amber-300 text-xs font-black px-2 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSelected5SSetor('PICKING');
                  setIs5SModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 text-slate-950" /> Nova Auditoria 5S
              </button>
            </div>
          </div>

          {/* CARDS DE RESUMO DE ATINGIMENTO DO MÊS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Auditorias no Mês ({selectedMonth5S}/{selectedYear5S})
              </span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {filtered5SAuditsMonth.length}
              </div>
              <span className="text-[10px] text-amber-400 font-semibold block mt-1">
                Registros de 5S no período
              </span>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Média Cumprimento Meta Qtd
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {Math.round(collaborator5SStats.reduce((a, b) => a + b.pctQtdAtingimento, 0) / (collaborator5SStats.length || 1))}%
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                Aderência à rotina diária
              </span>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Média Qualidade 5S (% Conforme)
              </span>
              <div className="text-2xl font-black text-sky-400 mt-1 font-mono">
                {Math.round(collaborator5SStats.reduce((a, b) => a + b.realQualidade, 0) / (collaborator5SStats.length || 1))}%
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                Meta Qualidade: &ge; 80%
              </span>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Áreas na Meta no Mês
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {collaborator5SStats.filter(c => c.atingiu && c.numAreas > 0).length} / {collaborator5SStats.filter(c => c.numAreas > 0).length}
              </div>
              <span className="text-[10px] text-amber-400/80 font-semibold block mt-1">
                Responsáveis em Conformidade
              </span>
            </div>
          </div>

          {/* GRÁFICOS: META VS REAL QUANTIDADE E QUALIDADE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRÁFICO 1: QUANTIDADE DE 5S REALIZADAS POR COLABORADOR */}
            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" /> Quantidade de 5S Realizadas por Colaborador (Meta vs Real)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Mês {selectedMonth5S}/{selectedYear5S}</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collaborator5SStats.filter(c => c.numAreas > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="shortName" stroke="#94a3b8" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="metaQtd" name="Meta Qtd Audits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realQtd" name="Real Qtd Realizadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO 2: QUALIDADE DO 5S DE ACORDO COM AS RESPOSTAS */}
            <div className="bg-[#0b1222] border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" /> Qualidade Média do 5S (% Conforme por Respostas)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Meta: 80%</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collaborator5SStats.filter(c => c.numAreas > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="shortName" stroke="#94a3b8" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="metaQualidade" name="Meta Qualidade (80%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realQualidade" name="Qualidade Real (%)" radius={[4, 4, 0, 0]}>
                      {collaborator5SStats.filter(c => c.numAreas > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.realQualidade >= 80 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TABELA DE META E REAL DO MÊS DE CADA COLABORADOR */}
          <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3.5 bg-[#131d38] border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" /> Desempenho Mensal dos Colaboradores do Cadastro (Meta vs Real)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Mês Selecionado: {MESES_ANO_5S.find(m => m.value === selectedMonth5S)?.label} / {selectedYear5S}
                </span>
                <button
                  onClick={() => setIs5SImportModalOpen(true)}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Database className="w-3 h-3 text-white" /> Base / Importar Base 5S
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-500/10 text-amber-300 text-[10px] uppercase border-b border-amber-500/20 font-black">
                    <th className="p-3 whitespace-nowrap">MATRÍCULA</th>
                    <th className="p-3 whitespace-nowrap">COLABORADOR</th>
                    <th className="p-3 whitespace-nowrap">CARGO</th>
                    <th className="p-3 whitespace-nowrap">ÁREAS RESPONSÁVEIS</th>
                    <th className="p-3 text-center whitespace-nowrap">META QTD</th>
                    <th className="p-3 text-center whitespace-nowrap">REAL QTD</th>
                    <th className="p-3 text-center whitespace-nowrap">% ATING. FREQUÊNCIA</th>
                    <th className="p-3 text-center whitespace-nowrap">META QUALIDADE</th>
                    <th className="p-3 text-center whitespace-nowrap">REAL QUALIDADE (%)</th>
                    <th className="p-3 text-center whitespace-nowrap">NOTA FINAL 5S</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {collaborator5SStats.map((item) => (
                    <tr key={item.matricula} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400 text-[11px] whitespace-nowrap">{item.matricula}</td>
                      <td className="p-3 font-black text-white font-sans whitespace-nowrap">{item.nome}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">{item.cargo}</td>
                      <td className="p-3 font-sans text-[11px]">
                        {item.assignedAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.assignedAreas.map(a => (
                              <span key={a} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap">
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px] whitespace-nowrap">Sem áreas de 5S vinculadas</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300 whitespace-nowrap">{item.metaQtd}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400 whitespace-nowrap">{item.realQtd}</td>
                      <td className="p-3 text-center font-mono font-bold whitespace-nowrap">
                        {item.isExempt ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                            N/A
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${item.pctQtdAtingimento >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {item.pctQtdAtingimento}%
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300 whitespace-nowrap">80%</td>
                      <td className="p-3 text-center font-mono font-black text-sky-400 whitespace-nowrap">
                        {item.isExempt ? 'N/A' : `${item.realQualidade}%`}
                      </td>
                      <td className="p-3 text-center font-mono font-black whitespace-nowrap">
                        {item.isExempt ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                            N/A (ISENTO)
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap ${item.atingiu ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                            {item.notaFinal}% ({item.atingiu ? 'ATINGIDO' : 'FORA DA META'})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA OFICIAL DAS 14 ÁREAS DO ARMAZÉM E CONEXÃO COM O CADASTRO */}
          <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden space-y-2">
            <div className="p-3.5 bg-[#131d38] border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" /> Tabela de Áreas do Armazém (14 Locais) e Vínculo ao Cadastro
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilter5SMode('todos')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${filter5SMode === 'todos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  Todas (14)
                </button>
                <button
                  onClick={() => setFilter5SMode('atingiram')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${filter5SMode === 'atingiram' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  ✅ Atingiram
                </button>
                <button
                  onClick={() => setFilter5SMode('fora')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${filter5SMode === 'fora' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ⚠️ Fora Meta
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-500/10 text-amber-300 text-[10px] uppercase border-b border-amber-500/20 font-black">
                    <th className="p-3">ÁREA</th>
                    <th className="p-3">RESPONSÁVEL (VÍNCULO CADASTRO MESTRE)</th>
                    <th className="p-3 text-center">META QTD (MÊS)</th>
                    <th className="p-3 text-center">REAL QTD</th>
                    <th className="p-3 text-center">META QUALIDADE</th>
                    <th className="p-3 text-center">REAL QUALIDADE (%)</th>
                    <th className="p-3 text-center">NOTA FINAL 5S</th>
                    <th className="p-3 text-center">STATUS</th>
                    <th className="p-3 text-right">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {LISTA_5S_OFICIAL.map((row) => {
                    const currentRespName = areaResponsaveis[row.area] || DEFAULT_AREA_RESPONSAVEIS[row.area] || 'DEJEAN SILVA DE OLIVEIRA';
                    
                    const sectorAudits = filtered5SAuditsMonth.filter(a => 
                      (a.setor || '').toLowerCase().trim() === row.area.toLowerCase().trim()
                    );
                    const realQtd = sectorAudits.length;
                    const metaQtd = 22;
                    const pctQtd = Math.min(100, Math.round((realQtd / metaQtd) * 100));

                    const realQualidade = sectorAudits.length > 0
                      ? Math.round(sectorAudits.reduce((acc, curr) => acc + (curr.notaPercentual || 0), 0) / sectorAudits.length)
                      : row.realPctDefault;

                    const notaFinal5S = Math.round(realQualidade * (0.5 + 0.5 * (pctQtd / 100)));
                    const atingiuMeta = notaFinal5S >= row.metaPct;

                    if (filter5SMode === 'atingiram' && !atingiuMeta) return null;
                    if (filter5SMode === 'fora' && atingiuMeta) return null;

                    return (
                      <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-black text-white font-sans flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                          {row.area}
                        </td>
                        <td className="p-3">
                          <select
                            value={currentRespName}
                            onChange={(e) => handleUpdateAreaResponsavel(row.area, e.target.value)}
                            className="bg-[#111a30] text-amber-300 text-xs font-black uppercase px-2.5 py-1 rounded-lg border border-slate-700 outline-none w-full max-w-[280px] cursor-pointer hover:border-amber-500/50"
                          >
                            {LISTA_COLABORADORES_OFICIAIS.map(c => (
                              <option key={c.matricula} value={c.nome}>
                                {c.nome} ({c.cargo})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-300">22</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-400">{realQtd}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-300">{row.metaPct}%</td>
                        <td className="p-3 text-center font-mono font-black text-sky-400">{realQualidade}%</td>
                        <td className="p-3 text-center font-mono font-black text-sm">
                          <span className={`px-2 py-0.5 rounded ${atingiuMeta ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                            {notaFinal5S}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {atingiuMeta ? (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ATINGIDO
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-500/30 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" /> FORA DA META
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelected5SSetor(row.area);
                              setIs5SModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Auditar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[#0b1222] border-t border-slate-800 text-[11px] font-black text-amber-400/90 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              OBS: O CUMPRIMENTO DIÁRIO DAS AUDITORIAS DE 5S PELA EQUIPE COMPÕE A NOTA DA VARIÁVEL E LIGA DPO.
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO 3: CONTROLE QUINZENAL DE PRAGAS (IMPORTAÇÃO PDF) ── */}
      {activeSubTab === 'pragas' && (
        <div className="bg-[#111a30] border border-emerald-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
          
          {/* BANNER AUTOMÁTICO DE LEMBRETE NOS DIAS 15 E 30 DO MÊS */}
          {(() => {
            const todayDay = new Date().getDate();
            const isDay15or30 = todayDay === 15 || todayDay === 30 || todayDay === 14 || todayDay === 16 || todayDay === 29 || todayDay === 31;
            
            if (!isDay15or30) return null;

            return (
              <div className="p-4 bg-amber-950/80 border-2 border-amber-500 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl shrink-0">
                    <Bell className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/30 px-2.5 py-0.5 rounded-md border border-amber-400/40">
                      🔔 ALERTA DE RENOVAÇÃO QUINZENAL - DIA 15 / DIA 30
                    </span>
                    <h4 className="text-xs font-black text-white uppercase mt-1">
                      Lembrete Automático de Atualização do Certificado de Controle de Pragas
                    </h4>
                    <p className="text-xs text-amber-100 font-medium mt-0.5">
                      Hoje é dia <strong className="text-amber-300 underline font-mono">{todayDay}</strong> do mês. É dia de importar o novo Certificado/Laudo Quinzenal de Desratização, Dedetização e Sanificação em formato PDF.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPragasModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shrink-0"
                >
                  Importar Laudo Hoje
                </button>
              </div>
            );
          })()}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-emerald-400" /> CONTROLE SANITÁRIO E VETORES (GUARABIRA)
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md">
                  Periodicidade Exigida: Quinzenal (15 Dias)
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-2 flex items-center gap-2">
                Importação do Controle Quinzenal de Pragas (Laudos PDF)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload e arquivamento oficial dos laudos técnicos de desratização, dedetização e sanificação emitidos pela empresa especializada.
              </p>
            </div>

            <button
              onClick={() => setShowPragasModal(!showPragasModal)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Upload className="w-4 h-4 text-emerald-200" />
              {showPragasModal ? 'Fechar Formularização' : '+ Importar Laudo Quinzenal (PDF)'}
            </button>
          </div>

          {/* CARD DO STATUS ATUAL DO LAUDO VIGENTE */}
          {laudosPragas.length > 0 && (() => {
            const latest = laudosPragas[0];
            const statusInfo = getPestStatus(latest.dataVencimento);

            return (
              <div className={`p-5 bg-[#0b1222] border-2 ${statusInfo.bgCard} rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl shrink-0">
                    <FileCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black border uppercase tracking-wider ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        Certificado: #{latest.numeroCertificado}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white">
                      {latest.empresaEspecializada}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-300 pt-1">
                      <div><span className="text-slate-500">Execução:</span> <strong>{new Date(latest.dataExecucao + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                      <div><span className="text-slate-500">Validade Até:</span> <strong className="text-emerald-400 font-mono">{new Date(latest.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                      <div><span className="text-slate-500">Resp. Técnico:</span> <strong>{latest.responsavelTecnico}</strong></div>
                      <div><span className="text-slate-500">Arquivo PDF:</span> <strong className="text-cyan-300 underline font-mono">{latest.fileName}</strong></div>
                    </div>

                    {latest.observacoes && (
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        "{latest.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-wrap">
                  {latest.arquivos && latest.arquivos.length > 0 ? (
                    latest.arquivos.map((arq, idx) => (
                      <a
                        key={idx}
                        href={arq.fileDataUrl}
                        download={arq.fileName}
                        className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                        title={`Baixar ${arq.fileName}`}
                      >
                        <Download className="w-4 h-4" /> Baixar PDF {latest.arquivos!.length > 1 ? `#${idx + 1}` : ''}
                      </a>
                    ))
                  ) : latest.fileDataUrl ? (
                    <a
                      href={latest.fileDataUrl}
                      download={latest.fileName}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Baixar PDF
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">PDF de Exemplo Integrado</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* FORMULARIO DE IMPORTACAO DE LAUDO PDF */}
          {showPragasModal && (
            <form onSubmit={handleSavePragasLaudo} className="bg-[#0b1222] border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" /> Formuário de Anexo e Cadastro do Laudo Quinzenal de Pragas
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  Suporta múltiplos arquivos PDF (.pdf)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Empresa Especializada *</label>
                  <input
                    type="text"
                    value={empresaEspecializada}
                    onChange={(e) => setEmpresaEspecializada(e.target.value)}
                    placeholder="Ex: Imunizadora & Dedetizadora Guarabira LTDA"
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nº Certificado / Laudo *</label>
                  <input
                    type="text"
                    value={numCertificado}
                    onChange={(e) => setNumCertificado(e.target.value)}
                    placeholder="Ex: CERT-PRAGAS-2026/015"
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Responsável Técnico / Conselho *</label>
                  <input
                    type="text"
                    value={respTecnico}
                    onChange={(e) => setRespTecnico(e.target.value)}
                    placeholder="Ex: Dr. Fernando Arcoverde (CRQ/CRBio)"
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Data de Execução *</label>
                  <input
                    type="date"
                    value={dataExecucaoPragas}
                    onChange={(e) => {
                      setDataExecucaoPragas(e.target.value);
                      if (e.target.value) {
                        const d = new Date(e.target.value);
                        d.setDate(d.getDate() + 15);
                        setDataVencimentoPragas(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Data de Vencimento (Validade 15 Dias) *
                  </label>
                  <input
                    type="date"
                    value={dataVencimentoPragas}
                    onChange={(e) => setDataVencimentoPragas(e.target.value)}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Anexos do Laudo (Múltiplos PDFs) *
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handlePdfFileChange}
                    className="w-full bg-[#111a30] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    💡 Pressione Ctrl/Cmd ou Shift para selecionar múltiplos arquivos PDF simultaneamente.
                  </span>
                </div>
              </div>

              {/* LISTA DE ARQUIVOS ANEXADOS / SELECIONADOS */}
              {selectedPdfFiles.length > 0 && (
                <div className="p-3 bg-[#070d19] border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="text-[11px] font-black uppercase text-emerald-400 flex items-center justify-between">
                    <span>Arquivos Selecionados ({selectedPdfFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPdfFiles([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Remover todos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPdfFiles.map((fileItem, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2 text-xs text-slate-200 font-mono"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={fileItem.fileName}>
                          {fileItem.fileName}
                        </span>
                        {fileItem.size && <span className="text-[10px] text-slate-400">({fileItem.size})</span>}
                        <button
                          type="button"
                          onClick={() => handleRemovePdfFile(idx)}
                          className="text-slate-400 hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                          title="Remover este arquivo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Observações Técnicas / Perímetros Inspecionados</label>
                <textarea
                  rows={2}
                  value={obsPragas}
                  onChange={(e) => setObsPragas(e.target.value)}
                  placeholder="Ex: Aplicação de gel raticida e cupinicida nas áreas do armazém e docas. Sem pragas ativas encontradas."
                  className="w-full bg-[#111a30] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPragasModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-200" /> Salvar & Importar {selectedPdfFiles.length > 1 ? `${selectedPdfFiles.length} Laudos PDF` : 'Laudo PDF'}
                </button>
              </div>
            </form>
          )}

          {/* HISTÓRICO DE LAUDOS QUINZENAIS */}
          <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#131d38] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <strong className="text-xs text-white uppercase tracking-wider font-black flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Histórico de Laudos Quinzenais de Pragas Importados
              </strong>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#0b1222] border border-slate-700 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Filtrar Mês:</span>
                  <select
                    value={selectedPragasMonth}
                    onChange={(e) => setSelectedPragasMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-emerald-400 outline-none cursor-pointer"
                  >
                    <option value="todos" className="bg-[#0b1222] text-white">Todos os Meses</option>
                    <option value="08/2026" className="bg-[#0b1222] text-white">Agosto / 2026</option>
                    <option value="07/2026" className="bg-[#0b1222] text-white">Julho / 2026</option>
                    <option value="06/2026" className="bg-[#0b1222] text-white">Junho / 2026</option>
                    <option value="05/2026" className="bg-[#0b1222] text-white">Maio / 2026</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Total: {
                    laudosPragas.filter(l => {
                      if (selectedPragasMonth === 'todos') return true;
                      const [year, month] = l.dataExecucao.split('-');
                      return `${month}/${year}` === selectedPragasMonth;
                    }).length
                  } Laudo(s)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b1222] text-slate-400 text-[10px] uppercase border-b border-slate-800 font-black">
                    <th className="p-3">Nº Certificado</th>
                    <th className="p-3">Empresa Especializada</th>
                    <th className="p-3">Data Execução</th>
                    <th className="p-3">Data Vencimento</th>
                    <th className="p-3">Status Validade</th>
                    <th className="p-3">Arquivo PDF</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans text-xs">
                  {laudosPragas
                    .filter(l => {
                      if (selectedPragasMonth === 'todos') return true;
                      const [year, month] = l.dataExecucao.split('-');
                      return `${month}/${year}` === selectedPragasMonth;
                    })
                    .map((laudo) => {
                    const statusInfo = getPestStatus(laudo.dataVencimento);

                    return (
                      <tr key={laudo.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-white">
                          #{laudo.numeroCertificado}
                        </td>
                        <td className="p-3 font-bold text-slate-200">
                          {laudo.empresaEspecializada}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Resp: {laudo.responsavelTecnico}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          {new Date(laudo.dataExecucao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {new Date(laudo.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black border uppercase ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {laudo.arquivos && laudo.arquivos.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {laudo.arquivos.map((arq, idx) => (
                                <a
                                  key={idx}
                                  href={arq.fileDataUrl}
                                  download={arq.fileName}
                                  className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 transition-colors"
                                  title={`Baixar ${arq.fileName}`}
                                >
                                  <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{arq.fileName}</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <a
                              href={laudo.fileDataUrl}
                              download={laudo.fileName}
                              className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{laudo.fileName}</span>
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {laudo.arquivos && laudo.arquivos.length > 0 ? (
                              laudo.arquivos.map((arq, idx) => (
                                <a
                                  key={idx}
                                  href={arq.fileDataUrl}
                                  download={arq.fileName}
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1 text-[10px] font-bold"
                                  title={`Baixar ${arq.fileName}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {laudo.arquivos!.length > 1 && <span>#{idx + 1}</span>}
                                </a>
                              ))
                            ) : laudo.fileDataUrl ? (
                              <a
                                href={laudo.fileDataUrl}
                                download={laudo.fileName}
                                className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all"
                                title="Baixar Laudo PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            ) : null}
                            <button
                              onClick={() => handleDeletePragasLaudo(laudo.id)}
                              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition-all cursor-pointer"
                              title="Excluir Laudo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO 4: RONDA DE QUALIDADE SEMANAL GSA ── */}
      {activeSubTab === 'ronda_gsa' && (
        <RondaGsaComponent user={user} empresaId={empresa?.id} />
      )}

      <ImportExport5SModal
        isOpen={is5SImportModalOpen}
        onClose={() => setIs5SImportModalOpen(false)}
        onDataUpdated={reloadAudits}
      />
    </div>
  );
}
