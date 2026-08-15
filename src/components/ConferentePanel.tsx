import React, { useState, useEffect } from 'react';
import { db, isCustomFirebaseConnected } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Usuario, Empresa, Tarefa, ArmazemTemperaturaLog, TmrDemand } from '../types';
import { useEmpresaData } from '../context/EmpresaDataContext';
import { PRODUCTS } from '../planosData';
import SugerirMelhoriaCard from './SugerirMelhoriaCard';
import { filterHistoryForUser, HistoryRestrictionNotice } from '../utils/historyFilter';
import { ManualInstrucaoCard } from './ManualInstrucaoCard';
import { 
  parse03114902Report, 
  getStoredEfcVehicles, 
  saveEfcVehicles, 
  subscribeToEfcVehicles,
  mergeNewEfcVehicles,
  EfcEfdVehicle, 
  calculateEfcMetrics, 
  calculateEfdMetrics 
} from '../utils/efcEfdManager';
import { addTmrDemand, getStoredTmrDemands, deleteTmrDemand, updateTmrDemandOperators } from '../utils/tmrManager';
import { Upload, FileSpreadsheet, CheckCircle2, Clock, AlertTriangle, Truck, Play, Check, Filter, Trash2, Edit3, Plus, X, Calendar, Thermometer, Droplets, AlertCircle, ShieldAlert, Users, Search, ArrowRight, ExternalLink } from 'lucide-react';
import ValidadesPanel from './ValidadesPanel';
import RefugoPanel from './RefugoPanel';
import TemperaturaImportExportBar from './TemperaturaImportExportBar';
import { Checklist5SForm, Collaborator5SPerformanceCard } from './Checklist5SModal';
import { GuiaAcoesOperacionais } from './GuiaAcoesOperacionais';
import { OperationalCollaboratorPnpBanner } from './OperationalCollaboratorPnpBanner';
import { getStoredTempLogs } from '../utils/tempStorage';
import { saveJornadaRecord, saveMultipleJornadas, saveDailyFaturadoRecord, getStoredJornadas, getStoredMontagens, saveMontagemRecord, finalizarMontagemRecord, WlpMontagemRecord, JornadaRecord } from '../utils/jornadaUtils';
import { OperationalNotificationBell } from './OperationalNotificationBell';

const SAMPLE_03114902_CSV = `UNB;Nome UNB;Transportadora;Nome Transportadora;Data Entrega;Roteirizado;Nro do Mapa;Nro do RoadShow;Hora Imp Roadshow;AS / Rota;Armazém;Veículo;Placa;Veiculo Substituto;Motorista;Carga;MPD;Hora MPD;Classificação;KM Prev.;Tempo Prev. (+almoço);Entregas;Total de caixas;% Ocupação Caixas;Total peso;% Ocupação Peso;% Tempo;% Eficiência;Ação;Mapas da Ação;Usuario;Data;Hora;Carga Atual;Excesso;Filial Origem;Cidades +Entregas;Região +Entregas;Clientes;Mapa Transbordo;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016078;05;19:56:09;Rota;01;Toco;RLR8G79;;000000000010;Fixa;Saída portaria;07:02;;172,54;11:41:00;58;208,58;64,77 ;5770;82,43 ;100,00;82,43 ;;;;;;Roterizada;Tempo;;TACIMA (30) / DONA INES (25) / RIACHAO (5);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016079;05;19:56:09;Rota;01;Truck;TOZ8B50;;000000001053;Fixa;Saída portaria;07:03;;121,11;12:56:00;51;296,52;70,60 ;8258;91,76 ;100,00;91,76 ;;;;;;Roterizada;Tempo;;MULUNGU (24) / MARI (12);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016080;05;19:56:10;Rota;01;Truck;QFG1259;;000000001165;Fixa;Saída portaria;07:03;;61,57;09:56:00;7;367,97;75,09 ;10726;82,50 ;100,00;82,50 ;;;;;;Roterizada;;;ALAGOA GRANDE (6);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016081;05;19:56:10;Rota;01;Toco;TOU7F39;;000000001049;Fixa;Saída portaria;07:03;;72,87;08:42:00;40;259,12;80,47 ;6895;98,50 ;100,00;98,50 ;;;;;;Roterizada;;;ALAGOA GRANDE (40);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016082;05;19:56:10;Rota;01;Toco;OXO0532;;000000001140;Fixa;Saída portaria;07:04;;86,39;06:42:00;18;244,57;75,95 ;6742;96,32 ;100,00;96,32 ;;;;;;Roterizada;;;SOLANEA (18);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016083;05;19:56:11;Rota;01;VUC;RLW0C17;;000000001020;Fixa;Saída portaria;07:04;;84,93;07:45:00;42;186,98;78,56 ;5002;90,95 ;100,00;90,95 ;;;;;;Roterizada;;;BANANEIRAS (41);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016084;05;19:56:11;Rota;01;Toco;RLU4H49;;000000001164;Fixa;Saída portaria;07:05;;65,96;10:52:00;60;218,61;67,89 ;5997;85,67 ;100,00;85,67 ;;;;;;Roterizada;Tempo;;ARACAGI (55);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016085;05;19:56:11;Rota;01;Truck;TOZ8B20;;000000099999;Fixa;Carga montada;06:34;;92,56;05:38:00;3;234,02;55,71 ;6526;72,52 ;67,60 ;49,02 ;;;;;;Roterizada;;;MAMANGUAPE (3);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016086;05;19:56:11;Rota;01;Truck;NPR2601;;000000000050;Fixa;Saída portaria;07:05;;99,53;06:45:00;9;332,12;79,07 ;9508;88,86 ;81,00 ;71,97 ;;;;;;Roterizada;;;JACARAU (8);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016087;05;19:56:12;Rota;01;Truck;SLB3J76;;000000001019;Fixa;Saída portaria;07:05;;141,25;14:46:00;56;338,11;80,50 ;9475;105,28;100,00;105,28;;;;;;Roterizada;Peso/Tempo;;JACARAU (35);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016088;05;19:56:12;Rota;01;Truck;OXO0782;;000000099999;Fixa;Carga montada;06:34;;4,14;12:34:00;4;326,25;77,67 ;9176;101,96;100,00;101,96;;;;;;Roterizada;Peso/Tempo;;GUARABIRA (4);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016089;05;19:56:12;Rota;01;VUC;TPA6D10;;000000000020;Fixa;Saída portaria;07:06;;24,80;03:36:00;21;83,48;99,38 ;2162;48,04 ;43,20 ;42,93 ;;;;;;Roterizada;;;GUARABIRA (21);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016090;05;19:56:13;Rota;01;VUC;OXO0552;;000000001059;Fixa;Saída portaria;07:06;;119,94;06:33:00;24;177,78;74,69 ;4785;87,00 ;78,60 ;68,38 ;;;;;;Roterizada;;;MAMANGUAPE (21);;
5;PAU BRASIL GUARABIRA;1;DISTRIBUIDORA DE BEBIDAS PAU BRASIL BREJ;31/07/2026;Sim;016091;05;19:56:13;Rota;01;Truck;SLB4A26;;000000001034;Fixa;Saída portaria;07:06;;175,89;12:09:00;56;328,07;78,11 ;8825;98,05 ;100,00;98,05 ;;;;;;Roterizada;Tempo;;RIO TINTO (58);;`;

interface ConferentePanelProps {
  user: Usuario;
  empresa: Empresa | null;
  theme?: 'light' | 'dark';
  initialTab?: 'import_placas' | 'rr' | 'tmr' | 'validade' | 'retorno_rota' | 'refugo';
}

export default function ConferentePanel({ user, empresa, initialTab, theme = 'dark' }: ConferentePanelProps) {
  const empresaId = empresa?.id || 'demo';
  const draftKey = `conferente_draft_${empresaId}_${user.nome || 'guest'}`;
  const empresaData = useEmpresaData();

  // Helper to load safe initial state
  const getDraftValue = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {
      console.error(e);
    }
    return defaultValue;
  };

  const [conferente, setConferente] = useState<string>(() => getDraftValue('conferente', ''));
  const [conferentes, setConferentes] = useState<string[]>(['GILSON ROSA DA SILVA', 'MATHEUS']);
  const [newConfName, setNewConfName] = useState('');

  const [searchQuery, setSearchQuery] = useState<string>(() => getDraftValue('searchQuery', ''));
  const [selectedProd, setSelectedProd] = useState<{ codigo: number, descricao: string } | null>(() => getDraftValue('selectedProd', null));
  const [quantidade, setQuantidade] = useState<number | ''>(() => {
    const val = getDraftValue('quantidade', '');
    return val === 1 ? '' : (val || '');
  });
  const [operator, setOperator] = useState<string>(() => getDraftValue('operator', ''));
  const [operators, setOperators] = useState<string[]>(['MARIVALDO', 'RONILDO', 'PAULO PEREIRA']);

  // Tasks lists
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'done'>('open');
  const [creating, setCreating] = useState(false);
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.searchQuery || parsed.selectedProd || (parsed.quantidade && parsed.quantidade !== 1) || parsed.operator);
      }
    } catch (e) {}
    return false;
  });

  // Dispatch Category State: 'picking' | 'tmr'
  const [dispatchType, setDispatchType] = useState<'picking' | 'tmr'>('picking');
  const [tmrTipoPlaca, setTmrTipoPlaca] = useState<'casa' | 'terceiros'>('casa');
  const [tmrPlacaCasa, setTmrPlacaCasa] = useState<string>('RLT5J54');
  const [tmrCarreta, setTmrCarreta] = useState('');
  const [tmrRevenda, setTmrRevenda] = useState('');
  const [tmrTipoCarga, setTmrTipoCarga] = useState<'TMR Revenda' | 'Carreta Transbordo' | 'Recarga' | 'Terceiros'>('TMR Revenda');
  const [tmrInstrucoes, setTmrInstrucoes] = useState('');
  const [tmrLitrinho, setTmrLitrinho] = useState<number | ''>('');
  const [tmrLitrao, setTmrLitrao] = useState<number | ''>('');
  const [tmr600Verde, setTmr600Verde] = useState<number | ''>('');
  const [tmr600Ambar, setTmr600Ambar] = useState<number | ''>('');
  const [tmrBarrilChopp, setTmrBarrilChopp] = useState<number | ''>('');
  const [tmrPbr1, setTmrPbr1] = useState<number | ''>('');
  const [tmrPbr2, setTmrPbr2] = useState<number | ''>('');

  // TMR Management & History states
  const [selectedTmrOperators, setSelectedTmrOperators] = useState<string[]>([]);
  const [tmrSubTab, setTmrSubTab] = useState<'ativas' | 'historico'>('ativas');
  const [tmrSearchFilter, setTmrSearchFilter] = useState('');
  const [tmrStatusFilter, setTmrStatusFilter] = useState<'todas' | 'pending' | 'in_progress' | 'done'>('todas');
  const [redelegateDemand, setRedelegateDemand] = useState<TmrDemand | null>(null);
  const [redelegateOps, setRedelegateOps] = useState<string[]>([]);

  // Temperature State
  const [tempDataISO, setTempDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tempHora, setTempHora] = useState<string>('09:00');
  const [tempValor, setTempValor] = useState<string>('');
  const [tempUmidade, setTempUmidade] = useState<string>('58');
  const [tempSetor, setTempSetor] = useState<string>('Armazém Central');
  const [tempObs, setTempObs] = useState<string>('');

  // States for Editing Vehicle
  const [editingVehicle, setEditingVehicle] = useState<EfcEfdVehicle | null>(null);
  const [editPlaca, setEditPlaca] = useState('');
  const [editMapa, setEditMapa] = useState('');
  const [editTipoVeiculo, setEditTipoVeiculo] = useState('Truck');
  const [editCaixas, setEditCaixas] = useState<number | ''>('');
  const [editMotorista, setEditMotorista] = useState('');
  const [editDataEntrega, setEditDataEntrega] = useState('');
  const [editTipoCarga, setEditTipoCarga] = useState('Rota Comercial');

  // States for Manual Avulsa Addition
  const [showAddAvulsaModal, setShowAddAvulsaModal] = useState(false);
  const [avulsaPlaca, setAvulsaPlaca] = useState('');
  const [avulsaMapa, setAvulsaMapa] = useState('');
  const [avulsaTipoVeiculo, setAvulsaTipoVeiculo] = useState('Truck');
  const [avulsaCaixas, setAvulsaCaixas] = useState<number | ''>('');
  const [avulsaMotorista, setAvulsaMotorista] = useState('');
  const [avulsaTipoCarga, setAvulsaTipoCarga] = useState<'Rota Comercial' | 'Recarga' | 'Terceiros'>('Rota Comercial');
  const [avulsaOperador, setAvulsaOperador] = useState('');

  // Conferente Shift / Journey Management
  const shiftKey = `conferente_shift_${empresaId}_${user?.uid || user?.nome || 'conferente'}`;
  const [shiftStarted, setShiftStarted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(shiftKey + '_active') === 'true';
    } catch {
      return false;
    }
  });
  const [shiftStartTime, setShiftStartTime] = useState<string>(() => {
    try {
      return localStorage.getItem(shiftKey + '_start_time') || '';
    } catch {
      return '';
    }
  });

  const handleStartShift = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setShiftStarted(true);
    setShiftStartTime(nowStr);
    localStorage.setItem(shiftKey + '_active', 'true');
    localStorage.setItem(shiftKey + '_start_time', nowStr);
    alert(`🚀 Jornada do Conferente iniciada às ${nowStr}! Ponto de início registrado no WLP.`);
  };

  const handleEndShift = () => {
    if (!window.confirm('Confirma o encerramento da jornada do Conferente?')) return;

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const todayISO = new Date().toISOString().split('T')[0];
    const parts = todayISO.split('-');
    const mesAno = `${parts[1]}/${parts[0]}`;

    let durHrs = 7.33;
    if (shiftStartTime) {
      try {
        const [h1, m1] = shiftStartTime.split(':').map(Number);
        const [h2, m2] = nowStr.split(':').map(Number);
        const diffMins = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        durHrs = parseFloat((diffMins / 60).toFixed(2)) || 7.33;
      } catch (e) {}
    }

    const record: JornadaRecord = {
      id: `jrn-conf-${Date.now()}`,
      colaboradorNome: user?.nome || conferente || 'Conferente',
      cargo: 'Conferente',
      dataStr: todayStr,
      dataISO: todayISO,
      mesAno,
      horaInicio: shiftStartTime || '07:00',
      horaFim: nowStr,
      duracaoHoras: durHrs,
      empresaId,
      observacoes: 'Jornada encerrada via Painel do Conferente',
      criadoEm: new Date().toISOString()
    };

    saveJornadaRecord(record);

    setShiftStarted(false);
    setShiftStartTime('');
    localStorage.removeItem(shiftKey + '_active');
    localStorage.removeItem(shiftKey + '_start_time');

    alert(`🏁 Jornada do Conferente encerrada às ${nowStr}! Duração total: ${durHrs}h. Ponto computado no Dashboard WLP.`);
  };

  const handleCreateTmrDemand = () => {
    if (!conferente) {
      alert('Selecione seu nome de Conferente antes de despachar.');
      return;
    }
    
    const finalPlaca = tmrTipoPlaca === 'casa' ? tmrPlacaCasa : tmrCarreta.trim().toUpperCase();
    if (!finalPlaca) {
      alert('Informe a placa da carreta de terceiros ou selecione uma Carreta da Casa.');
      return;
    }

    const nLitrinho = Number(tmrLitrinho || 0);
    const nLitrao = Number(tmrLitrao || 0);
    const n600Verde = Number(tmr600Verde || 0);
    const n600Ambar = Number(tmr600Ambar || 0);
    const nBarrilChopp = Number(tmrBarrilChopp || 0);
    const nPbr1 = Number(tmrPbr1 || 0);
    const nPbr2 = Number(tmrPbr2 || 0);

    const totalP = nLitrinho + nLitrao + n600Verde + n600Ambar + nBarrilChopp + nPbr1 + nPbr2;
    
    // For House Trailers: active asset assignment is mandatory
    if (tmrTipoPlaca === 'casa' && totalP <= 0) {
      alert(`Para Carretas da Casa (${finalPlaca}), é obrigatório atribuir a quantidade de ativos de giro (Litrinho, Litrão, 600 Verde, 600 Âmbar, Chopp, PBR1 ou PBR2).`);
      return;
    }

    const opDesignadoStr = selectedTmrOperators.length > 0 
      ? selectedTmrOperators.join(', ') 
      : (operator || 'TODOS');

    addTmrDemand(empresaId, {
      carreta: finalPlaca,
      tipoPlaca: tmrTipoPlaca,
      isTerceiros: tmrTipoPlaca === 'terceiros',
      revendaNome: tmrRevenda.trim() || (tmrTipoPlaca === 'terceiros' ? 'Carreta Terceiros' : 'Revenda / Unidade'),
      tipoCarga: tmrTipoCarga,
      instrucoes: tmrInstrucoes.trim(),
      palletsLitrinho: nLitrinho,
      palletsLitrao: nLitrao,
      pallets600Verde: n600Verde,
      pallets600Ambar: n600Ambar,
      palletsBarrilChopp: nBarrilChopp,
      palletsPbr1: nPbr1,
      palletsPbr2: nPbr2,
      palletsPbr: nPbr1 + nPbr2,
      totalPallets: totalP,
      conferente,
      operadorDesignado: opDesignadoStr,
      operadoresAtribuidos: selectedTmrOperators.length > 0 ? selectedTmrOperators : undefined
    });

    setTmrCarreta('');
    setTmrRevenda('');
    setTmrInstrucoes('');
    setTmrLitrinho('');
    setTmrLitrao('');
    setTmr600Verde('');
    setTmr600Ambar('');
    setTmrBarrilChopp('');
    setTmrPbr1('');
    setTmrPbr2('');
    setSelectedTmrOperators([]);
    setTmrDemands(getStoredTmrDemands(empresaId));
  };

  const handleOpenRedelegateModal = (demand: TmrDemand) => {
    setRedelegateDemand(demand);
    if (demand.operadoresAtribuidos && demand.operadoresAtribuidos.length > 0) {
      setRedelegateOps([...demand.operadoresAtribuidos]);
    } else if (demand.operadorDesignado && demand.operadorDesignado !== 'TODOS') {
      setRedelegateOps(demand.operadorDesignado.split(', ').map(s => s.trim()));
    } else {
      setRedelegateOps([]);
    }
  };

  const handleSaveRedelegation = () => {
    if (!redelegateDemand) return;
    const opStr = redelegateOps.length > 0 ? redelegateOps.join(', ') : 'TODOS';
    updateTmrDemandOperators(empresaId, redelegateDemand.id, opStr, redelegateOps);
    setTmrDemands(getStoredTmrDemands(empresaId));
    setRedelegateDemand(null);
  };

  const handleDeleteTmrDemand = (id: string) => {
    if (confirm('Tem certeza de que deseja cancelar/excluir esta demanda TMR?')) {
      deleteTmrDemand(empresaId, id);
      setTmrDemands(getStoredTmrDemands(empresaId));
    }
  };

  const handleStartEditVehicle = (v: EfcEfdVehicle) => {
    setEditingVehicle(v);
    setEditPlaca(v.placa);
    setEditMapa(v.mapa || '');
    setEditTipoVeiculo(v.tipoVeiculo || 'Truck');
    setEditCaixas(v.caixas || 0);
    setEditMotorista(v.motorista || '');
    setEditDataEntrega(v.dataEntrega || '');
    setEditTipoCarga(v.tipoCarga || 'Rota Comercial');
  };

  const handleSaveEditVehicle = () => {
    if (!editingVehicle) return;
    const cleanPlaca = editPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlaca || cleanPlaca.length < 5) {
      alert('Informe uma placa válida (mínimo 5 caracteres).');
      return;
    }

    const updated = efcVehicles.map(v => {
      if (v.id === editingVehicle.id) {
        return {
          ...v,
          placa: cleanPlaca,
          mapa: editMapa.trim() || v.mapa,
          tipoVeiculo: editTipoVeiculo.trim() || v.tipoVeiculo,
          caixas: Number(editCaixas) || 0,
          totalCaixas: Number(editCaixas) || 0,
          motorista: editMotorista.trim() || v.motorista,
          dataEntrega: editDataEntrega.trim() || v.dataEntrega,
          tipoCarga: editTipoCarga,
          isRecarga: editTipoCarga === 'Recarga'
        };
      }
      return v;
    });

    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Placa ${cleanPlaca} atualizada com sucesso!`);
    setEditingVehicle(null);
  };

  const handleSaveAddAvulsa = () => {
    const cleanPlaca = avulsaPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlaca || cleanPlaca.length < 5) {
      alert('Informe uma placa válida para inclusão avulsa (mínimo 5 caracteres).');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const formattedISO = now.toISOString().split('T')[0];

    const newVehicle: EfcEfdVehicle = {
      id: `veic_avulsa_${cleanPlaca}_${Date.now()}`,
      placa: cleanPlaca,
      mapa: avulsaMapa.trim() || 'M-AVULSA',
      tipoVeiculo: avulsaTipoVeiculo.trim() || 'Truck',
      caixas: Number(avulsaCaixas) || 0,
      totalCaixas: Number(avulsaCaixas) || 0,
      peso: (Number(avulsaCaixas) || 0) * 12,
      motorista: avulsaMotorista.trim() || 'Motorista Avulso',
      dataEntrega: formattedDate,
      dataEntregaISO: formattedISO,
      empresaId,
      statusCarregamento: 'Pendente',
      statusDescarregamento: 'Pendente',
      tipoCarga: avulsaTipoCarga,
      isRecarga: avulsaTipoCarga === 'Recarga',
      operadorDesignado: avulsaOperador || 'TODOS'
    };

    const updated = [newVehicle, ...efcVehicles];
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Placa avulsa ${cleanPlaca} adicionada com sucesso!`);

    setAvulsaPlaca('');
    setAvulsaMapa('');
    setAvulsaTipoVeiculo('Truck');
    setAvulsaCaixas('');
    setAvulsaMotorista('');
    setAvulsaOperador('');
    setShowAddAvulsaModal(false);
  };

  // Subtab navigation: 'import_placas' | 'rr' | 'tmr' | 'validade' | 'temperatura' | 'wlp' | '5s' | 'retorno_rota'
  const [panelTab, setPanelTab] = useState<'import_placas' | 'rr' | 'tmr' | 'validade' | 'temperatura' | 'wlp' | '5s' | 'retorno_rota'>(
    initialTab === 'refugo' ? 'retorno_rota' : (initialTab as any) || 'import_placas'
  );
  const [importTableFilter, setImportTableFilter] = useState<'Todos' | 'EFC' | 'EFD' | 'Pernoites'>('Todos');
  const [placaSearchFilter, setPlacaSearchFilter] = useState('');

  // WLP Shift & Assembly States for Conferente
  const [wlpDataISO, setWlpDataISO] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wlpTurno, setWlpTurno] = useState<'Noite' | 'Dia'>('Noite');
  const [wlpHoraInicioMontagem, setWlpHoraInicioMontagem] = useState<string>('18:00');
  const [wlpHoraFimMontagem, setWlpHoraFimMontagem] = useState<string>('01:30');
  const [wlpVolumeHL, setWlpVolumeHL] = useState<number | ''>(680.5);

  // Official team definitions matching master collaborator records
  const EQUIPE_NOTURNA_PADRAO = [
    { nome: 'CICERO MATHEU DE OLIVEIRA SILVA', cargo: 'Conferente', apelido: 'Cicero Mateu' },
    { nome: 'ELDENKLEBER MAURICIO DA SILVA', cargo: 'Ajudante', apelido: 'Eldenkleber' },
    { nome: 'NATANAEL LUIZ DA SILVA', cargo: 'Ajudante', apelido: 'Natanael' },
    { nome: 'EDILSON VIEIRA DA SILVA', cargo: 'Ajudante', apelido: 'Edilson' },
    { nome: 'LUIS ANTONIO FREIRE MOREIRA', cargo: 'Ajudante', apelido: 'Luis' },
    { nome: 'ADMILTON HERMINIO DOS SANTOS MARCELINO', cargo: 'Ajudante', apelido: 'Admilton' },
    { nome: 'DIMAS EMANUEL MISSIAS DA SILVA', cargo: 'Ajudante', apelido: 'Dimas' },
    { nome: 'PAULO PEREIRA DA SILVA', cargo: 'Empilhador', apelido: 'Paulo Pereira' },
    { nome: 'DIOGENES PEREIRA DA SILVA', cargo: 'Ajudante', apelido: 'Diogenes' }
  ];

  const EQUIPE_DIURNA_PADRAO = [
    { nome: 'GILSON ROSA DA SILVA', cargo: 'Conferente', apelido: 'Gilson' },
    { nome: 'GLADSON LISBOA DOS SANTOS', cargo: 'Ajudante', apelido: 'Gladson' },
    { nome: 'OZENILDO SOUSA SILVA', cargo: 'Ajudante', apelido: 'Ozenildo' },
    { nome: 'DEJEAN SILVA DE OLIVEIRA', cargo: 'Ajudante', apelido: 'Dejean' },
    { nome: 'MARIVALDO ARTUR ALVES', cargo: 'Empilhador', apelido: 'Marivaldo' },
    { nome: 'JOSE RONILDO DA SILVA', cargo: 'Empilhador', apelido: 'Ronildo' }
  ];

  // Selected present collaborators
  const [selectedNightColabs, setSelectedNightColabs] = useState<string[]>(EQUIPE_NOTURNA_PADRAO.map(c => c.nome));
  const [selectedDayColabs, setSelectedDayColabs] = useState<string[]>(EQUIPE_DIURNA_PADRAO.map(c => c.nome));

  const [wlpExtraColabs, setWlpExtraColabs] = useState<Array<{ id: string; nome: string; cargo: string; horaInicio: string; horaFim: string; duracaoHoras: number }>>([]);
  
  const [extraNome, setExtraNome] = useState('');
  const [extraCargo, setExtraCargo] = useState<'Ajudante' | 'Empilhador' | 'Conferente'>('Ajudante');
  const [extraHoraInicio, setExtraHoraInicio] = useState('07:00');
  const [extraHoraFim, setExtraHoraFim] = useState('16:20');

  // Lock shift time state
  const shiftLockKey = `wlp_shift_locked_${wlpDataISO}_${wlpTurno}`;
  const [isShiftTimeLocked, setIsShiftTimeLocked] = useState<boolean>(() => !!localStorage.getItem(`wlp_shift_locked_${wlpDataISO}_${wlpTurno}`));

  useEffect(() => {
    setIsShiftTimeLocked(!!localStorage.getItem(`wlp_shift_locked_${wlpDataISO}_${wlpTurno}`));
  }, [wlpDataISO, wlpTurno]);

  const calcShiftHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let mins1 = h1 * 60 + m1;
    let mins2 = h2 * 60 + m2;
    if (mins2 < mins1) mins2 += 24 * 60; // Overnight shift past midnight
    const diffMins = mins2 - mins1;
    return parseFloat((diffMins / 60).toFixed(2));
  };

  const handleToggleNightColab = (nome: string) => {
    setSelectedNightColabs(prev => 
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const handleSelectAllNight = () => {
    if (selectedNightColabs.length === EQUIPE_NOTURNA_PADRAO.length) {
      setSelectedNightColabs([]);
    } else {
      setSelectedNightColabs(EQUIPE_NOTURNA_PADRAO.map(c => c.nome));
    }
  };

  const handleToggleDayColab = (nome: string) => {
    setSelectedDayColabs(prev => 
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const handleSelectAllDay = () => {
    if (selectedDayColabs.length === EQUIPE_DIURNA_PADRAO.length) {
      setSelectedDayColabs([]);
    } else {
      setSelectedDayColabs(EQUIPE_DIURNA_PADRAO.map(c => c.nome));
    }
  };

  const handleAddExtraColab = () => {
    if (!extraNome.trim()) {
      alert('Informe o nome do colaborador extra.');
      return;
    }
    const dur = calcShiftHours(extraHoraInicio, extraHoraFim);
    const newItem = {
      id: `extra-${Date.now()}`,
      nome: extraNome.trim().toUpperCase(),
      cargo: extraCargo,
      horaInicio: extraHoraInicio,
      horaFim: extraHoraFim,
      duracaoHoras: dur
    };
    setWlpExtraColabs(prev => [...prev, newItem]);
    setExtraNome('');
    toast(`Colaborador extra ${newItem.nome} adicionado (${dur}h).`);
  };

  const handleRemoveExtraColab = (id: string) => {
    setWlpExtraColabs(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveWlpShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wlpDataISO) {
      alert('Selecione a data do turno.');
      return;
    }

    const volumeNum = Number(wlpVolumeHL) || 0;
    const parts = wlpDataISO.split('-');
    const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;

    // 1. Save Daily Faturado HL record for WLP (Night shift only required)
    if (wlpTurno === 'Noite' && volumeNum > 0) {
      saveDailyFaturadoRecord({
        id: `fat-${wlpDataISO}`,
        dataISO: wlpDataISO,
        dataStr,
        mesAno,
        volumeHL: volumeNum,
        empresaId,
        registradoPor: `${user?.nome || conferente || 'Conferente'} (Noite)`,
        registradoEm: new Date().toISOString(),
        origem: 'MANUAL'
      });
    }

    // 2. Generate Jornada Records for Present Collaborators
    const newJornadas: JornadaRecord[] = [];
    const dur = calcShiftHours(wlpHoraInicioMontagem, wlpHoraFimMontagem);

    if (wlpTurno === 'Noite') {
      if (selectedNightColabs.length === 0) {
        alert('Selecione ao menos um colaborador presente no turno noturno.');
        return;
      }

      // Record WLP Montagem
      saveMontagemRecord({
        id: `montagem-${wlpDataISO}`,
        dataISO: wlpDataISO,
        dataStr,
        mesAno,
        conferenteInicio: user?.nome || conferente || 'Conferente Noturno',
        horaInicio: wlpHoraInicioMontagem,
        horaFim: wlpHoraFimMontagem,
        duracaoHoras: dur,
        status: 'FINALIZADA',
        volumeHL: volumeNum,
        qtdColaboradores: selectedNightColabs.length,
        empresaId,
        observacoes: `Montagem Noturna (${selectedNightColabs.length} colabs presentes)`,
        criadoEm: new Date().toISOString()
      });

      selectedNightColabs.forEach((nomeColab, i) => {
        const foundObj = EQUIPE_NOTURNA_PADRAO.find(c => c.nome === nomeColab);
        newJornadas.push({
          id: `jrn-noturna-${wlpDataISO}-${i}-${Date.now()}`,
          colaboradorNome: nomeColab,
          cargo: foundObj?.cargo || 'Ajudante',
          dataStr,
          dataISO: wlpDataISO,
          mesAno,
          horaInicio: wlpHoraInicioMontagem,
          horaFim: wlpHoraFimMontagem,
          duracaoHoras: dur,
          empresaId,
          observacoes: `Montagem Noite (${wlpHoraInicioMontagem} às ${wlpHoraFimMontagem}) - Apontado via Conferente`,
          criadoEm: new Date().toISOString()
        });
      });
    } else {
      if (selectedDayColabs.length === 0) {
        alert('Selecione ao menos um colaborador presente no turno diurno.');
        return;
      }

      selectedDayColabs.forEach((nomeColab, i) => {
        const foundObj = EQUIPE_DIURNA_PADRAO.find(c => c.nome === nomeColab);
        newJornadas.push({
          id: `jrn-diurna-${wlpDataISO}-${i}-${Date.now()}`,
          colaboradorNome: nomeColab,
          cargo: foundObj?.cargo || 'Ajudante',
          dataStr,
          dataISO: wlpDataISO,
          mesAno,
          horaInicio: wlpHoraInicioMontagem,
          horaFim: wlpHoraFimMontagem,
          duracaoHoras: dur,
          empresaId,
          observacoes: `Turno Diurno (${wlpHoraInicioMontagem} às ${wlpHoraFimMontagem}) - Apontado via Conferente`,
          criadoEm: new Date().toISOString()
        });
      });
    }

    // 3. Add Extra Collaborators Journeys
    wlpExtraColabs.forEach((ext, i) => {
      newJornadas.push({
        id: `jrn-extra-${wlpDataISO}-${i}-${Date.now()}`,
        colaboradorNome: ext.nome,
        cargo: ext.cargo,
        dataStr,
        dataISO: wlpDataISO,
        mesAno,
        horaInicio: ext.horaInicio,
        horaFim: ext.horaFim,
        duracaoHoras: ext.duracaoHoras,
        empresaId,
        observacoes: `Colaborador Extra adicionado no Apontamento WLP`,
        criadoEm: new Date().toISOString()
      });
    });

    if (newJornadas.length > 0) {
      saveMultipleJornadas(newJornadas, empresaId);
    }

    // Lock shift start time so it cannot be re-opened/re-started
    localStorage.setItem(`wlp_shift_locked_${wlpDataISO}_${wlpTurno}`, 'true');
    setIsShiftTimeLocked(true);

    if (newJornadas.length > 0) {
      saveMultipleJornadas(newJornadas, empresaId);
    }

    window.dispatchEvent(new CustomEvent('app_data_updated'));
    window.dispatchEvent(new CustomEvent('local_data_changed'));

    toast(`Turno de ${dataStr} salvo! ${newJornadas.length} jornada(s) computada(s) no WLP.`);
    setWlpExtraColabs([]);
  };

  // EFC / EFD Vehicles State
  const [efcVehicles, setEfcVehicles] = useState<EfcEfdVehicle[]>(() => getStoredEfcVehicles(empresaId));
  const [tmrDemands, setTmrDemands] = useState(() => getStoredTmrDemands(empresaId));
  const [pernoiteFilter, setPernoiteFilter] = useState<'Todos' | 'D1' | 'D2' | 'D3' | 'D4'>('Todos');
  const [selectedBulkOperator, setSelectedBulkOperator] = useState<string>('');

  // Temperature Logs State & Handlers
  const [tempLogs, setTempLogs] = useState<ArmazemTemperaturaLog[]>(() => {
    return getStoredTempLogs();
  });

  const reloadTempLogs = () => {
    setTempLogs(getStoredTempLogs());
  };

  useEffect(() => {
    window.addEventListener('armazem_temp_updated', reloadTempLogs);
    window.addEventListener('armazem_temp_logs_updated', reloadTempLogs);
    window.addEventListener('storage', reloadTempLogs);
    return () => {
      window.removeEventListener('armazem_temp_updated', reloadTempLogs);
      window.removeEventListener('armazem_temp_logs_updated', reloadTempLogs);
      window.removeEventListener('storage', reloadTempLogs);
    };
  }, []);

  const handleSaveTempLog = (e: React.FormEvent) => {
    e.preventDefault();
    const tempNum = parseFloat(tempValor);
    if (isNaN(tempNum)) {
      alert('Informe uma temperatura válida em °C (ex: 22.5).');
      return;
    }
    const umidNum = parseInt(tempUmidade, 10) || 55;
    const parts = tempDataISO.split('-');
    const dataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const mesAno = `${parts[1]}/${parts[0]}`;
    const isAlerta = tempNum > 28.0 || tempNum < 18.0;
    const loggedUserLabel = `${user?.nome || conferente || 'Conferente Responsável'} (${user?.cargo || 'Conferente / ADM'})`;

    const newLog: ArmazemTemperaturaLog = {
      id: `temp-${tempDataISO}-${tempHora.replace(':', '')}`,
      dataISO: tempDataISO,
      dataFormatted,
      mesAno,
      hora: tempHora,
      temperatura: tempNum,
      umidade: umidNum,
      setor: tempSetor || 'Armazém Central',
      conferenteNome: user?.nome || conferente || 'Conferente Responsável',
      registradoPor: loggedUserLabel,
      cargoUsuario: user?.cargo || 'Conferente / ADM',
      observacao: tempObs.trim() || (isAlerta ? `⚠️ ALERTA DE TEMPERATURA FORA DO PADRÃO (${tempNum}°C)` : 'Aferição registrada com sucesso'),
      alertaCritico: isAlerta
    };

    const filtered = tempLogs.filter(l => !(l.dataISO === tempDataISO && l.hora === tempHora));
    const updated = [newLog, ...filtered];
    updated.sort((a, b) => b.dataISO.localeCompare(a.dataISO) || b.hora.localeCompare(a.hora));

    setTempLogs(updated);
    localStorage.setItem('armazem_temperatura_logs', JSON.stringify(updated));
    window.dispatchEvent(new Event('armazem_temp_updated'));
    toast(`Temperatura de ${tempNum}°C (${tempHora}) registrada por ${loggedUserLabel}!`);

    setTempValor('');
    setTempObs('');
  };

  const handleDeleteTempLog = (id: string) => {
    const updated = tempLogs.filter(l => l.id !== id);
    setTempLogs(updated);
    localStorage.setItem('armazem_temperatura_logs', JSON.stringify(updated));
    window.dispatchEvent(new Event('armazem_temp_updated'));
    toast('Registro de temperatura removido.');
  };

  useEffect(() => {
    const unsubEfc = subscribeToEfcVehicles(empresaId, (list) => {
      setEfcVehicles(list);
    });

    const handleTmrUpdate = () => {
      setTmrDemands(getStoredTmrDemands(empresaId));
    };

    window.addEventListener('tmr_demands_updated', handleTmrUpdate);
    window.addEventListener('storage', handleTmrUpdate);
    window.addEventListener('local_data_changed', handleTmrUpdate);

    return () => {
      unsubEfc();
      window.removeEventListener('tmr_demands_updated', handleTmrUpdate);
      window.removeEventListener('storage', handleTmrUpdate);
      window.removeEventListener('local_data_changed', handleTmrUpdate);
    };
  }, [empresaId]);

  // Handle CSV Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parse03114902Report(text, empresaId);
        if (parsed.length > 0) {
          const merged = mergeNewEfcVehicles(empresaId, parsed);
          setEfcVehicles(merged);
          toast(`Importação concluída! ${parsed.length} veículos/placas carregados.`);
        } else {
          alert('Não foi possível reconhecer veículos/placas no arquivo. Verifique o formato do relatório 03.11.49.02.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle CSV Import STRICTLY for EFD (Descarregamento)
  const handleFileUploadEFD = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parse03114902Report(text, empresaId);
        if (parsed.length > 0) {
          const efdTagged = parsed.map(v => ({
            ...v,
            statusDescarregamento: 'Pendente' as const,
            efdCompliant: false
          }));
          const merged = mergeNewEfcVehicles(empresaId, efdTagged);
          setEfcVehicles(merged);
          setImportTableFilter('EFD');
          toast(`Importação EFD concluída! ${parsed.length} placas direcionadas para o Descarregamento (EFD).`);
        } else {
          alert('Não foi possível reconhecer veículos/placas no arquivo. Verifique o formato do relatório 03.11.49.02.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Transfer Night Assembly to Day Shift
  const handleTransferMontagemToDay = () => {
    if (!window.confirm('Confirma a transferência da montagem noturna para o turno do dia? As horas dos ajudantes noturnos (Eldenkleber, Natanael, Edilson, Luis, Admilton, Dimas) serão encerradas e o desvio será registrado no WLP.')) {
      return;
    }

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const todayISO = new Date().toISOString().split('T')[0];
    const montagens = getStoredMontagens(empresaId);
    const active = montagens.find(m => m.dataISO === todayISO || m.status === 'EM_ANDAMENTO');

    if (active) {
      finalizarMontagemRecord(active.id, user?.nome || conferente || 'Conferente Diurno', nowStr, true, empresaId);
    } else {
      const parts = todayISO.split('-');
      const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      const mesAno = `${parts[1]}/${parts[0]}`;
      saveMontagemRecord({
        id: `montagem-transf-${Date.now()}`,
        dataISO: todayISO,
        dataStr,
        mesAno,
        conferenteInicio: 'Conferente Noturno',
        conferenteFim: user?.nome || conferente || 'Conferente Diurno',
        horaInicio: '18:00',
        horaFim: nowStr,
        status: 'FINALIZADA',
        finalizadoPelaManha: true,
        duracaoHoras: 13.5,
        qtdColaboradores: 7,
        empresaId,
        observacoes: 'Montagem noturna transferida e finalizada pelo turno diurno',
        criadoEm: new Date().toISOString()
      });
    }

    window.dispatchEvent(new CustomEvent('app_data_updated'));
    window.dispatchEvent(new Event('wlp_montagem_updated'));
    window.dispatchEvent(new Event('storage'));

    toast(`🔄 Montagem transferida para o turno diurno às ${nowStr}! Desvio de WLP computado.`);
  };

  const handleLoadSampleCSV = () => {
    const parsed = parse03114902Report(SAMPLE_03114902_CSV, empresaId);
    const merged = mergeNewEfcVehicles(empresaId, parsed);
    setEfcVehicles(merged);
    toast(`Exemplo Pau Brasil Guarabira carregado! ${parsed.length} veículos prontos para operação.`);
  };

  const handleUpdateLoadingStatus = (vId: string, action: 'iniciar' | 'finalizar') => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        if (action === 'iniciar') {
          return { ...v, statusCarregamento: 'Em Carregamento' as const, horaInicioCarregamento: nowStr };
        } else {
          const efcCompliant = nowStr <= '06:30';
          return { ...v, statusCarregamento: 'Finalizado' as const, horaFimCarregamento: nowStr, efcCompliant };
        }
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Carregamento da placa atualizado para ${action === 'iniciar' ? 'Iniciado' : 'Finalizado (' + nowStr + ')'}`);
  };

  const handleToggleRecarga = (vId: string) => {
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const isRecarga = !v.isRecarga;
        return {
          ...v,
          isRecarga,
          tipoCarga: isRecarga ? 'Recarga' : 'Rota Comercial'
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast('Status de Recarga (TMR) atualizado');
  };

  const handleDeleteVehicle = (vId: string, placa: string) => {
    const updated = efcVehicles.filter(v => v.id !== vId);
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Placa ${placa} removida com sucesso!`);
  };

  const handleTogglePernoite = (vId: string) => {
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        const pernoiteMarked = !v.pernoiteMarked;
        return {
          ...v,
          pernoiteMarked,
          statusDescarregamento: pernoiteMarked ? 'Pernoite' as const : 'Pendente' as const,
          pernoiteStatus: pernoiteMarked ? (v.pernoiteStatus || 'D1') : undefined
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast('Status de Pernoite atualizado');
  };

  const handleAssignOperatorToVehicle = (vId: string, opName: string) => {
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        return {
          ...v,
          operadorDesignado: opName || 'TODOS'
        };
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Atribuído para ${opName || 'TODOS OS EMPILHADORES'}`);
  };

  const handleAssignOperatorToAllVehicles = () => {
    if (!selectedBulkOperator) {
      alert('Selecione o colaborador empilhador antes de atribuir em lote.');
      return;
    }
    const updated = efcVehicles.map(v => ({
      ...v,
      operadorDesignado: selectedBulkOperator
    }));
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Todas as ${updated.length} placas foram atribuídas para ${selectedBulkOperator}`);
  };

  const handleUpdateUnloadingStatus = (vId: string, action: 'iniciar' | 'finalizar' | 'pernoite') => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = efcVehicles.map(v => {
      if (v.id === vId) {
        if (action === 'iniciar') {
          return { ...v, statusDescarregamento: 'Em Descarregamento' as const, horaInicioDescarregamento: nowStr };
        } else if (action === 'finalizar') {
          const efdCompliant = nowStr <= '22:00';
          return { ...v, statusDescarregamento: 'Finalizado' as const, horaFimDescarregamento: nowStr, efdCompliant };
        } else if (action === 'pernoite') {
          return { 
            ...v, 
            statusDescarregamento: 'Pernoite' as const, 
            pernoiteMarked: true, 
            pernoiteStatus: (v.pernoiteStatus || 'D1') as 'D1'|'D2'|'D3'|'D4' 
          };
        }
      }
      return v;
    });
    setEfcVehicles(updated);
    saveEfcVehicles(empresaId, updated);
    toast(`Descarregamento da placa atualizado para ${action.toUpperCase()}`);
  };

  const toast = (msg: string) => {
    const el = document.createElement('div');
    el.className = 'fixed bottom-5 right-5 bg-[#032b5e] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl z-50 border border-amber-400';
    el.innerText = `⚡ ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  // Sync state with local draft saving
  useEffect(() => {
    const draftData = {
      conferente,
      searchQuery,
      selectedProd,
      quantidade,
      operator
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [conferente, searchQuery, selectedProd, quantidade, operator, draftKey]);

  // Sync with prop updates / user changing
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConferente(parsed.conferente || '');
        setSearchQuery(parsed.searchQuery || '');
        setSelectedProd(parsed.selectedProd || null);
        setQuantidade(parsed.quantidade === 1 ? '' : (parsed.quantidade || ''));
        setOperator(parsed.operator || '');
        setDraftRestored(!!(parsed.searchQuery || parsed.selectedProd || (parsed.quantidade && parsed.quantidade !== 1) || parsed.operator));
      } else {
        setConferente('');
        setSearchQuery('');
        setSelectedProd(null);
        setQuantidade('');
        setOperator('');
        setDraftRestored(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [draftKey]);

  // Read config list and user states from local storage (recovery)
  useEffect(() => {
    const cached = localStorage.getItem(`conferente_state_${empresaId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.conferentes) setConferentes(parsed.conferentes);
        if (parsed.conferente) setConferente(parsed.conferente);
        setOperators(['MARIVALDO', 'RONILDO', 'PAULO PEREIRA']);
      } catch (e) {}
    }
  }, [empresaId]);

  // Sync with Firestore Tasks (scoped to company)
  useEffect(() => {
    if (!db) {
      const savedTasks = localStorage.getItem(`tasks_${empresaId}`);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      return;
    }

    const rows = [...empresaData.tarefas];
    rows.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    setTasks(rows);
    localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(rows));
  }, [empresaData.tarefas, empresaId]);

  // Sync colaboradores from Firestore/localStorage to use as operators and conferentes
  useEffect(() => {
    const allowedOps = ['MARIVALDO', 'RONILDO', 'PAULO PEREIRA'];
    setOperators(allowedOps);

    if (!db) {
      const savedColab = localStorage.getItem(`colaboradores_${empresaId}`);
      if (savedColab) {
        const list = JSON.parse(savedColab);
        const confs = list
          .filter((c: any) => (c.funcao || '').toLowerCase() === 'conferente')
          .map((c: any) => c.nome.toUpperCase());
        if (confs.length > 0) setConferentes(confs);
      }
      return;
    }

    const list = empresaData.colaboradores;
    const confs = list
      .filter((c: any) => (c.funcao || '').toLowerCase() === 'conferente')
      .map((c: any) => c.nome.toUpperCase());
    if (confs.length > 0) setConferentes(confs);
  }, [empresaData.colaboradores, empresaId]);

  const persistState = (extra: Record<string, any> = {}) => {
    localStorage.setItem(`conferente_state_${empresaId}`, JSON.stringify({
      conferentes,
      conferente,
      operators,
      ...extra
    }));
  };

  const handleAddConferente = () => {
    const clean = newConfName.trim().toUpperCase();
    if (!clean || conferentes.includes(clean)) return;
    const upd = [...conferentes, clean];
    setConferentes(upd);
    setNewConfName('');
    localStorage.setItem(`conferente_state_${empresaId}`, JSON.stringify({ conferes: upd, conferente, operators }));
    toast('Conferente adicionado: ' + clean);
  };

  const handleCreateTask = async () => {
    if (!conferente || !operator || !quantidade || !selectedProd) {
      alert('Certifique-se de selecionar seu nome de Conferente, o produto e o Operador designado.');
      return;
    }

    setCreating(true);

    const newRow: Omit<Tarefa, '_docId'> & { empresaId: string } = {
      empresaId,
      id: Date.now() % 100000,
      codigo: selectedProd.codigo,
      descricao: selectedProd.descricao,
      quantidade: Number(quantidade),
      conferente,
      operador: operator,
      status: 'pending',
      criadoEm: new Date().toISOString(),
      iniciadoEm: null,
      finalizadoEm: null,
      duracaoMin: null
    };

    try {
      if (db) {
        await addDoc(collection(db, 'tarefas'), newRow);
      } else {
        const current = [...tasks, { _docId: String(Date.now()), ...newRow }];
        setTasks(current);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(current));
        localStorage.setItem(`tarefas_rows_${empresaId}`, JSON.stringify(current));
      }

      window.dispatchEvent(new CustomEvent('app_data_updated'));
      window.dispatchEvent(new CustomEvent('local_data_changed'));

      setSelectedProd(null);
      setSearchQuery('');
      setQuantidade('');
      setOperator('');
      setDraftRestored(false);
      localStorage.removeItem(draftKey);
      toast('Tarefa #' + newRow.id + ' despachada para ' + operator);
    } catch(e) {
      alert('Erro ao despachar tarefa: ' + e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (t: Tarefa) => {
    try {
      if (db && t._docId) {
        await deleteDoc(doc(db, 'tarefas', t._docId));
      } else {
        const remaining = tasks.filter(x => x.id !== t.id);
        setTasks(remaining);
        localStorage.setItem(`tasks_${empresaId}`, JSON.stringify(remaining));
      }
      toast('Tarefa #' + t.id + ' removida com sucesso.');
    } catch (e) {
      console.error(e);
      toast('Erro ao excluir tarefa #' + t.id);
    }
  };

  // Filter products for autocomplete dropdown
  const filteredProducts = PRODUCTS.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q || String(p.codigo).includes(q) || p.descricao.toLowerCase().includes(q);
  }).slice(0, 10);

  // Sync data lists
  const openTasksList = tasks.filter(t => t.status !== 'done');
  const doneTasksList = filterHistoryForUser<Tarefa>(tasks.filter(t => t.status === 'done'), user, (item: Tarefa) => item.finalizadoEm ? item.finalizadoEm.split('T')[0] : (item.criadoEm ? item.criadoEm.split('T')[0] : ''));

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#11151c] border border-[#222d3a] rounded-xl w-full gap-3">
        <div>
          <span className="font-sans font-black text-sm tracking-widest text-[#f5a623] uppercase flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" /> CONFERENTE / ADM & GESTÃO EFC / EFD
            <OperationalNotificationBell user={user} userRole="conferente" onNavigate={(panel, tab) => { if (tab) setActiveTab(tab as any); }} />
          </span>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
            Despacho de Pátio, Importação do Relatório 03.11.49.02 e Controle de Pernoites (D1–D4)
          </p>
        </div>
        <div className="text-[10px] text-[#22c55e] font-sans font-bold uppercase tracking-wider bg-[#22c55e]/10 px-3 py-1 rounded-full border border-[#22c55e]/20">
          Ambev DPO Operacional
        </div>
      </div>

      {/* MANUAL DE INSTRUÇÃO E METAS */}
      <ManualInstrucaoCard
        title="Manual de Instrução & Parâmetros de Meta — Conferência & Indicadores EFC / EFD"
        metrics={[
          {
            key: 'efc',
            label: 'Eficiência no Carregamento (EFC)',
            unit: '%',
            comoCalcular: '(Veículos com Carregamento Finalizado ≤ 06:30) ÷ (Total de Veículos Importados do Relatório 03.11.49.02) × 100.'
          },
          {
            key: 'efd',
            label: 'Eficiência no Descarregamento (EFD)',
            unit: '%',
            comoCalcular: '(Veículos Descarregados ≤ 22:00) ÷ (Total de Veículos que Saíram para Rota Comercial, Excluindo Pernoite do Cálculo de Falha) × 100.'
          }
        ]}
      />

      {/* CONTROLE DE JORNADA DO CONFERENTE */}
      <div className="bg-[#151b23] border border-amber-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-lg">
            ⏱️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Jornada do Conferente</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                shiftStarted 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {shiftStarted ? `JORNADA ATIVA (Início: ${shiftStartTime})` : 'JORNADA FECHADA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {shiftStarted 
                ? `Conferente ${user?.nome || conferente || 'Operacional'} trabalhando. Registre seus lançamentos de EFC, EFD e TMR.`
                : 'Inicie sua jornada para registrar os pontos de início e término e alimente o indicador de WLP.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!shiftStarted ? (
            <button
              type="button"
              onClick={handleStartShift}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Iniciar Jornada
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndShift}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Encerrar Jornada
            </button>
          )}
        </div>
      </div>

      {/* PAINEL EXCLUSIVO DO CONFERENTE - PNP E METAS VS REAL */}
      <OperationalCollaboratorPnpBanner user={user} theme={theme} />

      {/* QUADRO DE DEMANDAS PENDENTES (RESUMO CONFERENTE) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#151b23] border border-sky-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">EFC Pendentes</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {efcVehicles.filter(v => v.statusCarregamento !== 'Finalizado').length}
            </span>
          </div>
          <Truck className="w-5 h-5 text-sky-400" />
        </div>

        <div className="p-3.5 bg-[#151b23] border border-emerald-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">EFD Pendentes</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {efcVehicles.filter(v => (v.statusCarregamento === 'Finalizado' || v.pernoiteMarked || v.statusDescarregamento === 'Pernoite') && v.statusDescarregamento !== 'Finalizado').length}
            </span>
          </div>
          <Clock className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-3.5 bg-[#151b23] border border-amber-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">R&R Pendentes</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {openTasksList.length}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
        </div>

        <div className="p-3.5 bg-[#151b23] border border-purple-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">TMR Pendentes</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {tmrDemands.filter(t => t.status !== 'done').length}
            </span>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* NAV TABS: Importar Placas (03.11.49.02) | R&R | TMR | Validade | Temp | WLP | 5S | Retorno de Rota */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-[#151b23] border border-[#222d3a] p-2 rounded-xl w-full">
        <button
          onClick={() => setPanelTab('import_placas')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'import_placas'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span className="truncate">1. Placas</span>
          <span className="bg-slate-900 text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
            {efcVehicles.length}
          </span>
        </button>

        <button
          onClick={() => setPanelTab('rr')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'rr'
              ? 'bg-sky-600 text-white font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span className="truncate">2. R&R</span>
          <span className="bg-sky-950 text-sky-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
            {openTasksList.length}
          </span>
        </button>

        <button
          onClick={() => setPanelTab('tmr')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'tmr'
              ? 'bg-purple-600 text-white font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="truncate">3. TMR</span>
          <span className="bg-purple-950 text-purple-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
            {tmrDemands.filter(t => t.status !== 'done').length}
          </span>
        </button>

        <button
          onClick={() => setPanelTab('validade')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'validade'
              ? 'bg-emerald-600 text-white font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="truncate">4. Validades</span>
        </button>

        <button
          onClick={() => setPanelTab('temperatura')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'temperatura'
              ? 'bg-rose-600 text-white font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Thermometer className="w-4 h-4 shrink-0" />
          <span className="truncate">5. Temperatura</span>
        </button>

        <button
          onClick={() => setPanelTab('wlp')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'wlp'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0 text-slate-900" />
          <span className="truncate">6. WLP & Turno</span>
        </button>

        <button
          onClick={() => setPanelTab('5s')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === '5s'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">7. Realização 5S</span>
        </button>

        <button
          onClick={() => setPanelTab('retorno_rota')}
          className={`px-3 py-2.5 rounded-lg font-sans font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
            panelTab === 'retorno_rota'
              ? 'bg-indigo-600 text-white font-black shadow-md'
              : 'text-[#6a7d92] hover:text-white bg-transparent'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="truncate">8. Retorno Rota</span>
        </button>
      </div>

      {/* ── ABA 1: R&R (RESSUPRIMENTO & REABASTECIMENTO) ── */}
      {panelTab === 'rr' && (
        <div className="flex flex-col gap-6">
          {/* Identificação de conferente */}
          <div className="g-card p-6 flex flex-col gap-5">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623]">Identificação do Conferente</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Seu Nome de Conferente *</label>
                <select 
                  value={conferente}
                  onChange={e => { setConferente(e.target.value); persistState(); }}
                  className="g-input bg-[#151b23] border-[#1c2530]"
                >
                  <option value="">— Selecione seu nome —</option>
                  {conferentes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Novo conferente nome..."
                  value={newConfName}
                  onChange={e => setNewConfName(e.target.value)}
                  className="g-input flex-1"
                />
                <button 
                  onClick={handleAddConferente}
                  className="bg-[#151b23] border border-[#222d3a] hover:border-[#6a7d92] text-[#f5a623] text-xs font-sans font-bold px-4 py-2.5 rounded-lg tracking-wider uppercase cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Nova Tarefa R&R (Picking SKU) */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f5a623]">Despachar Nova Tarefa R&R (Ressuprimento de Picking)</h4>
              <div className="flex items-center gap-1.5 text-[9px] text-[#22c55e] font-black uppercase tracking-wider bg-[#22c55e]/5 px-2.5 py-1 rounded-lg border border-[#22c55e]/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Salvo automaticamente
              </div>
            </div>

            {draftRestored && (
              <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl text-xs text-amber-300">
                <div className="flex items-center gap-2 font-medium">
                  <span>⚡ Dados anteriores restaurados do rascunho salvo!</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProd(null);
                    setQuantidade('');
                    setOperator('');
                    setDraftRestored(false);
                    localStorage.removeItem(draftKey);
                  }}
                  className="text-[9px] uppercase font-black tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Limpar formulário
                </button>
              </div>
            )}

            {/* Busca SKU */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Pesquisar SKU (Código ou Nome)</label>
              <input 
                type="text"
                placeholder="Digite código SKU ou palavras..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="g-input"
              />
            </div>

            {/* Produto List grid */}
            <div className="p-3 bg-[#07090d] border border-[#222d3a] rounded-xl flex flex-col gap-1 max-h-36 overflow-y-auto">
              {filteredProducts.map(p => {
                const isSel = selectedProd?.codigo === p.codigo;
                return (
                  <div 
                    key={p.codigo}
                    onClick={() => setSelectedProd(p)}
                    className={`p-2.5 rounded-lg border cursor-pointer text-xs flex justify-between tracking-wide transition-all ${isSel ? 'bg-[#f5a623]/10 border-[#f5a623]/40' : 'bg-[#151b23]/50 border-[#1c2530] hover:bg-[#1a2030]'}`}
                  >
                    <span className="font-bold text-[#f5a623]">{p.codigo}</span>
                    <span className="flex-1 ml-4 truncate text-left text-[#e8eef5]">{p.descricao}</span>
                  </div>
                );
              })}
            </div>

            {/* Quantity and Operator designation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Quantidade de Paletes</label>
                <input 
                  type="number"
                  min={1}
                  placeholder="Digite a quantidade..."
                  value={quantidade}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '') {
                      setQuantidade('');
                    } else {
                      const num = parseInt(val, 10);
                      setQuantidade(isNaN(num) ? '' : Math.max(1, num));
                    }
                  }}
                  className="g-input text-center text-snow font-bold text-sm bg-[#151b23]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6a7d92]">Operador Designado *</label>
                <select 
                  value={operator}
                  onChange={e => { setOperator(e.target.value); }}
                  className="g-input bg-[#151b23] border-[#1c2530]"
                >
                  <option value="">— Selecionar operador —</option>
                  {operators.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button 
                type="button"
                disabled={creating || !selectedProd}
                onClick={handleCreateTask}
                className="py-3 px-4 text-xs font-bold font-sans tracking-widest text-[#07090d] bg-gradient-to-r from-[#f5a623] to-[#d4780a] hover:shadow-[0_4px_16px_rgba(245,166,35,0.25)] rounded-xl disabled:opacity-40 cursor-pointer text-center uppercase"
              >
                {creating ? 'Despachando...' : '➕ ATRIBUIR TAREFA OPERACIONAL'}
              </button>
            </div>
          </div>

          {/* GUIA DE AÇÕES CORRETIVAS E MELHORIAS - CONFERENTE */}
          <GuiaAcoesOperacionais user={user} roleName="Conferente" />

          {/* Relatório de Atividades Diárias (R&R) */}
          <div className="g-card p-6">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#6a7d92] mb-4">Relatório de Atividades Diárias (R&R)</h4>
            
            <div className="flex gap-2 border-b border-[#222d3a] mb-4">
              <button 
                onClick={() => setActiveTab('open')}
                className={`py-2 px-4 text-xs uppercase font-sans font-bold cursor-pointer transition-all ${activeTab === 'open' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92]'}`}
              >
                Tarefas Abertas ({openTasksList.length})
              </button>
              <button 
                onClick={() => setActiveTab('done')}
                className={`py-2 px-4 text-xs uppercase font-sans font-bold cursor-pointer transition-all ${activeTab === 'done' ? 'text-[#f5a623] border-b-2 border-b-[#f5a623]' : 'text-[#6a7d92]'}`}
              >
                Concluídas Hoje ({doneTasksList.length})
              </button>
            </div>

            {activeTab === 'open' ? (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {openTasksList.length === 0 ? (
                  <p className="text-xs text-[#6a7d92] text-center p-6">Nenhuma tarefa operativa em andamento ou pendente.</p>
                ) : (
                  openTasksList.map((t, i) => (
                    <div key={t._docId || i} className={`p-4 bg-[#151b23]/50 border border-[#222d3a] rounded-xl border-l-[3px] ${t.status === 'in_progress' ? 'border-l-[#3b82f6]' : 'border-l-[#f5a623]'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-sans font-bold text-[#f5a623] font-mono leading-none">TAREFA #{t.id} · SKU {t.codigo}</span>
                          <h5 className="text-xs font-bold text-snow leading-tight mt-1">{t.descricao}</h5>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl font-black text-snow leading-none block">{t.quantidade}</span>
                          <span className="text-[8px] font-sans tracking-wider text-[#6a7d92] uppercase font-bold">Paletes</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-[#6a7d92] border-t border-[#222d3a]/50 pt-2 mt-3 flex-wrap gap-2">
                        <div>
                          <span>Atribuída para: <strong className="text-[#3b82f6] font-extrabold">{t.operador}</strong> </span>
                          {t.iniciadoEm && <span>· Iniciada às {new Date(t.iniciadoEm).toLocaleTimeString()}</span>}
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[8px] tracking-[0.5px] ${t.status === 'in_progress' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' : 'bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20'}`}>
                            {t.status === 'in_progress' ? 'Em andamento' : 'Aguardando Operador'}
                          </span>
                          <button 
                            onClick={() => handleDeleteTask(t)}
                            className="text-[9px] font-black text-[#6a7d92] hover:text-[#ef4444] bg-transparent border-none cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                <HistoryRestrictionNotice user={user} />
                {doneTasksList.length === 0 ? (
                  <p className="text-xs text-[#6a7d92] text-center p-6">Nenhuma tarefa foi concluída de forma oficial hoje.</p>
                ) : (
                  doneTasksList.map((t, i) => (
                    <div key={t._docId || i} className="p-4 bg-[#151b23]/30 border border-[#222d3a] rounded-xl border-l-[3px] border-l-[#22c55e]">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-sans font-bold text-[#f5a623] font-mono leading-none">TAREFA #{t.id} · SKU {t.codigo}</span>
                          <h5 className="text-xs font-bold text-snow leading-tight mt-1">{t.descricao}</h5>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl font-black text-[#22c55e] leading-none block">{t.quantidade}</span>
                          <span className="text-[8px] font-sans tracking-wider text-[#6a7d92] uppercase font-bold">Paletes</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-[#6a7d92] border-t border-[#222d3a]/50 pt-2 mt-3 flex-wrap gap-2">
                        <div>
                          <span>Finalizado por: <strong className="text-snow">{t.operador}</strong> </span>
                          <span>· Tipo: <strong>{t.tipoOperacao || 'Abastecimento'}</strong></span>
                        </div>
                        <div>
                          Duração operacional: <strong className="text-[#22c55e] text-xs font-black">{t.duracaoMin} min </strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA 2: TMR (REVENDAS & TRANSBORDO) ── */}
      {panelTab === 'tmr' && (
        <div className="flex flex-col gap-6">
          {/* Identificação de conferente */}
          <div className="g-card p-6 flex flex-col gap-5">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400">Identificação do Conferente</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-slate-400">Seu Nome de Conferente *</label>
                <select 
                  value={conferente}
                  onChange={e => { setConferente(e.target.value); persistState(); }}
                  className="g-input bg-[#151b23] border-[#222d3a] text-amber-300 font-bold"
                >
                  <option value="">— Selecione seu nome —</option>
                  {conferentes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Novo conferente nome..."
                  value={newConfName}
                  onChange={e => setNewConfName(e.target.value)}
                  className="g-input flex-1"
                />
                <button 
                  onClick={handleAddConferente}
                  className="bg-[#151b23] border border-[#222d3a] hover:border-[#6a7d92] text-amber-400 text-xs font-sans font-bold px-4 py-2.5 rounded-lg tracking-wider uppercase cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Despachar Nova Demanda TMR */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                Despachar Nova Demanda TMR (Revendas / Vasilhames / Transbordo)
              </h4>
              <div className="flex items-center gap-1.5 text-[9px] text-amber-400 font-black uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                Meta TMR: Carreta ≤ 2h30 · Recarga ≤ 50min
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Seleção de Tipo de Placa: Casa vs Terceiros */}
              <div className="p-3 bg-[#11161d] border border-[#222d3a] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Classificação da Carreta TMR:
                </span>
                <div className="flex items-center gap-2 bg-[#1b222c] p-1 rounded-lg border border-[#2c3848]">
                  <button
                    type="button"
                    onClick={() => setTmrTipoPlaca('casa')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      tmrTipoPlaca === 'casa'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white bg-transparent'
                    }`}
                  >
                    🚚 Carreta da Casa (Frota Própria)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTmrTipoPlaca('terceiros')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      tmrTipoPlaca === 'terceiros'
                        ? 'bg-purple-600 text-white font-black shadow-sm'
                        : 'text-slate-400 hover:text-white bg-transparent'
                    }`}
                  >
                    🚛 Carreta de Terceiros (Avulsa)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tmrTipoPlaca === 'casa' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Placa da Carreta da Casa *</label>
                    <select
                      value={tmrPlacaCasa}
                      onChange={e => setTmrPlacaCasa(e.target.value)}
                      className="g-input font-mono font-bold text-amber-400 bg-[#151b23] border-[#222d3a]"
                    >
                      <option value="RLT5J54">RLT5J54 (Carreta Própria)</option>
                      <option value="RLT5J44">RLT 5J44 (Carreta Própria)</option>
                      <option value="RLU3F59">RLU3F59 (Carreta Própria)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Placa Terceiros / Avulsa *</label>
                    <input 
                      type="text"
                      placeholder="Ex: ABC1D23 / Placa Terceiro"
                      value={tmrCarreta}
                      onChange={e => setTmrCarreta(e.target.value)}
                      className="g-input uppercase font-bold text-purple-300"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prazo de Carregamento *</label>
                  <input 
                    type="text"
                    placeholder="Ex: Até 14:30 / 15:00 / Imediato"
                    value={tmrRevenda}
                    onChange={e => setTmrRevenda(e.target.value)}
                    className="g-input"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Operação (Meta)</label>
                  <select
                    value={tmrTipoCarga}
                    onChange={e => setTmrTipoCarga(e.target.value as any)}
                    className="g-input bg-[#151b23] border-[#1c2530] text-amber-300 font-bold"
                  >
                    <option value="TMR Revenda">TMR Revenda (Carreta — Meta ≤ 2h30)</option>
                    <option value="Carreta Transbordo">Carreta Transbordo (Meta ≤ 2h30)</option>
                    <option value="Recarga">Recarga (Meta ≤ 50min)</option>
                    <option value="Terceiros">Terceiros (Meta ≤ 50min)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-1 md:col-span-4 mt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      👥 Delegar Operadores de Empilhadeira (Selecione 1 ou mais)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedTmrOperators.length === 0 ? 'Delegado para TODOS OS EMPILHADORES' : `${selectedTmrOperators.length} operador(es) selecionado(s)`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#151b23] border border-[#222d3a] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedTmrOperators([])}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTmrOperators.length === 0
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-[#0d1218] text-slate-400 hover:text-white border border-[#1c2530]'
                      }`}
                    >
                      TODOS OS EMPILHADORES
                    </button>
                    {operators.map(op => {
                      const isSelected = selectedTmrOperators.includes(op);
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTmrOperators(prev => prev.filter(x => x !== op));
                            } else {
                              setSelectedTmrOperators(prev => [...prev, op]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 text-white font-black shadow-xs'
                              : 'bg-[#0d1218] text-slate-300 hover:text-white border border-[#1c2530]'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0d1218] border border-[#222d3a] rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    📦 Atribuição de Ativos de Giro (Vasilhames & PBR)
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    tmrTipoPlaca === 'terceiros' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    {tmrTipoPlaca === 'terceiros' ? 'Opcional para Terceiros' : 'Atribuição Padrão da Casa'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Litrinho</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmrLitrinho}
                      onChange={e => setTmrLitrinho(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-amber-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Litrão</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmrLitrao}
                      onChange={e => setTmrLitrao(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-amber-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">600 Verde</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmr600Verde}
                      onChange={e => setTmr600Verde(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">600 Âmbar</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmr600Ambar}
                      onChange={e => setTmr600Ambar(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-amber-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Barril Chopp</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmrBarrilChopp}
                      onChange={e => setTmrBarrilChopp(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-yellow-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">PBR1</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmrPbr1}
                      onChange={e => setTmrPbr1(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-blue-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">PBR2</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="0"
                      value={tmrPbr2}
                      onChange={e => setTmrPbr2(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="g-input text-center font-mono font-bold text-indigo-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instruções Adicionais de Carregamento/Descarregamento</label>
                  <input 
                    type="text"
                    placeholder="Ex: Descarregar carreta na baia 3 e carregar vasilhames com amarra de proteção..."
                    value={tmrInstrucoes}
                    onChange={e => setTmrInstrucoes(e.target.value)}
                    className="g-input text-xs"
                  />
                </div>
              </div>

              <button 
                type="button"
                onClick={handleCreateTmrDemand}
                className="py-3 px-4 text-xs font-bold font-sans tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 to-amber-600 hover:shadow-lg rounded-xl cursor-pointer text-center uppercase"
              >
                🚀 DESPACHAR DEMANDA TMR / REVENDAS
              </button>
            </div>
          </div>

          {/* Acompanhamento Operacional & Guia de Histórico TMR */}
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
              <div>
                <h4 className="font-sans font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  Acompanhamento Operacional & Guia de Histórico TMR
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Acompanhe o tempo de execução, delegue empilhadores adicionais e consulte o histórico auditável de carretas e recargas TMR.
                </p>
              </div>

            <div className="flex items-center gap-2 bg-[#151b23] p-1 rounded-xl border border-[#222d3a]">
              <button
                type="button"
                onClick={() => setTmrSubTab('ativas')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  tmrSubTab === 'ativas'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <span>⚡ Demandas Ativas</span>
                <span className="bg-purple-950 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  {tmrDemands.filter(t => t.status !== 'done').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTmrSubTab('historico')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  tmrSubTab === 'historico'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <span>📜 Guia de Histórico ({tmrDemands.length})</span>
              </button>
            </div>
          </div>

          {tmrSubTab === 'ativas' ? (
            <div className="flex flex-col gap-4">
              {tmrDemands.filter(t => t.status !== 'done').length === 0 ? (
                <div className="p-8 text-center bg-[#151b23]/30 border border-[#222d3a] rounded-xl text-slate-400 text-xs">
                  Nenhuma demanda TMR ativa no momento. Utilize o formulário acima para despachar uma nova demanda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tmrDemands.filter(t => t.status !== 'done').map(t => (
                    <div key={t.id} className={`p-4 bg-[#151b23]/60 border rounded-xl flex flex-col gap-3 relative ${
                      t.status === 'in_progress' ? 'border-blue-500/40 border-l-4 border-l-blue-500' : 'border-amber-500/40 border-l-4 border-l-amber-500'
                    }`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-lg text-amber-300">{t.carreta}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              t.isTerceiros || t.tipoPlaca === 'terceiros' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {t.isTerceiros || t.tipoPlaca === 'terceiros' ? 'Terceiros' : 'Casa'}
                            </span>
                            <span className="text-xs font-bold text-slate-300">· {t.revendaNome}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Operação: <strong className="text-slate-200">{t.tipoCarga || 'TMR Revenda'}</strong> · Conf: <strong className="text-slate-200">{t.conferente || 'ADM'}</strong>
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {t.status === 'in_progress' ? '⚡ Em Execução' : '⏳ Aguardando Início'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 p-2 bg-[#0d1218] rounded-lg text-center text-[10px]">
                        <div><span className="text-[8px] text-slate-500 block uppercase">Litrinho</span><span className="font-mono font-bold text-amber-300">{t.palletsLitrinho || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">Litrão</span><span className="font-mono font-bold text-amber-300">{t.palletsLitrao || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">600 Verde</span><span className="font-mono font-bold text-emerald-400">{t.pallets600Verde || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">600 Âmbar</span><span className="font-mono font-bold text-amber-500">{t.pallets600Ambar || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">Chopp</span><span className="font-mono font-bold text-yellow-400">{t.palletsBarrilChopp || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">PBR1</span><span className="font-mono font-bold text-blue-400">{t.palletsPbr1 || t.palletsPbr || 0}</span></div>
                        <div><span className="text-[8px] text-slate-500 block uppercase">PBR2</span><span className="font-mono font-bold text-indigo-400">{t.palletsPbr2 || 0}</span></div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-[#222d3a]/60 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 flex-wrap">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[10px] text-slate-400">Empilhadores:</span>
                          <span className="font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                            {t.operadoresAtribuidos && t.operadoresAtribuidos.length > 0 ? t.operadoresAtribuidos.join(', ') : (t.operadorDesignado || 'TODOS')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenRedelegateModal(t)}
                            className="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Users className="w-3 h-3" /> Re-delegar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTmrDemand(t.id)}
                            className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#151b23] p-3 rounded-xl border border-[#222d3a]">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por placa, revenda, operador ou conferente..."
                    value={tmrSearchFilter}
                    onChange={e => setTmrSearchFilter(e.target.value)}
                    className="g-input pl-9 text-xs w-full bg-[#0d1218]"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                  {(['todas', 'pending', 'in_progress', 'done'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTmrStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        tmrStatusFilter === st
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-[#0d1218] text-slate-400 hover:text-white border border-[#1c2530]'
                      }`}
                    >
                      {st === 'todas' && 'Todas'}
                      {st === 'pending' && '⏳ Aguardando'}
                      {st === 'in_progress' && '⚡ Em Andamento'}
                      {st === 'done' && '✅ Concluídas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-[#222d3a] rounded-xl bg-[#0d1218]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#151b23] border-b border-[#222d3a] text-[10px] uppercase font-mono font-bold text-slate-400">
                      <th className="p-3">Carreta / Prazo</th>
                      <th className="p-3">Operação / Status</th>
                      <th className="p-3 text-center">Ativos (Paletes)</th>
                      <th className="p-3">Início / Término / Duração</th>
                      <th className="p-3">Operadores / Conferente</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2530]">
                    {tmrDemands
                      .filter(t => {
                        if (tmrStatusFilter !== 'todas' && t.status !== tmrStatusFilter) return false;
                        if (!tmrSearchFilter.trim()) return true;
                        const q = tmrSearchFilter.toLowerCase();
                        return (
                          t.carreta.toLowerCase().includes(q) ||
                          t.revendaNome.toLowerCase().includes(q) ||
                          (t.operadorDesignado && t.operadorDesignado.toLowerCase().includes(q)) ||
                          (t.operadorExecutor && t.operadorExecutor.toLowerCase().includes(q)) ||
                          (t.conferente && t.conferente.toLowerCase().includes(q))
                        );
                      })
                      .map(t => {
                        const durMin = t.dataHoraInicio && t.dataHoraFim
                          ? Math.max(1, Math.round((new Date(t.dataHoraFim).getTime() - new Date(t.dataHoraInicio).getTime()) / 60000))
                          : t.tempoTotalMinutos || null;

                        const isCarreta = t.tipoCarga === 'TMR Revenda' || t.tipoCarga === 'Carreta Transbordo' || !t.tipoCarga;
                        const targetMin = isCarreta ? 150 : 50;
                        const noPrazo = durMin ? durMin <= targetMin : null;

                        return (
                          <tr key={t.id} className="hover:bg-[#151b23]/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-amber-300 text-sm">{t.carreta}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                  t.isTerceiros || t.tipoPlaca === 'terceiros' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {t.isTerceiros || t.tipoPlaca === 'terceiros' ? 'T' : 'Casa'}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-300 font-bold block mt-0.5">Prazo: {t.revendaNome || 'N/I'}</span>
                            </td>

                            <td className="p-3">
                              <span className="text-[10px] font-bold text-slate-300 block">{t.tipoCarga || 'TMR Revenda'}</span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase mt-1 ${
                                t.status === 'done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {t.status === 'done' ? '✅ Concluída' : t.status === 'in_progress' ? '⚡ Em Andamento' : '⏳ Pendente'}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <div className="inline-grid grid-cols-4 gap-1 text-[9px] font-mono bg-[#07090d] p-1.5 rounded-lg border border-[#1c2530]">
                                <div><span className="text-[7px] text-slate-500 uppercase block">Lit</span><span className="text-amber-300 font-bold">{t.palletsLitrinho || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">Litr</span><span className="text-amber-300 font-bold">{t.palletsLitrao || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">600V</span><span className="text-emerald-400 font-bold">{t.pallets600Verde || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">600A</span><span className="text-amber-500 font-bold">{t.pallets600Ambar || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">Chp</span><span className="text-yellow-400 font-bold">{t.palletsBarrilChopp || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">PBR1</span><span className="text-blue-400 font-bold">{t.palletsPbr1 || t.palletsPbr || 0}</span></div>
                                <div><span className="text-[7px] text-slate-500 uppercase block">PBR2</span><span className="text-indigo-400 font-bold">{t.palletsPbr2 || 0}</span></div>
                                <div className="bg-amber-500/10 rounded"><span className="text-[7px] text-amber-400 uppercase block">Tot</span><span className="text-amber-300 font-bold">{t.totalPallets || 0}</span></div>
                              </div>
                            </td>

                            <td className="p-3 text-[10px] text-slate-300 font-mono">
                              <div><span className="text-slate-500">Lançado:</span> {new Date(t.dataHoraCriacao || t.criadoEm).toLocaleTimeString()}</div>
                              {t.dataHoraInicio && <div><span className="text-slate-500">Início:</span> {new Date(t.dataHoraInicio).toLocaleTimeString()}</div>}
                              {t.dataHoraFim && <div><span className="text-slate-500">Fim:</span> {new Date(t.dataHoraFim).toLocaleTimeString()}</div>}
                              {durMin && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="font-bold text-amber-300">{durMin} min</span>
                                  {noPrazo !== null && (
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                      noPrazo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                      {noPrazo ? 'No Prazo' : 'Fora do Prazo'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-[10px]">
                              <div className="text-purple-300 font-bold">
                                Delegado: {t.operadoresAtribuidos && t.operadoresAtribuidos.length > 0 ? t.operadoresAtribuidos.join(', ') : (t.operadorDesignado || 'TODOS')}
                              </div>
                              {t.operadorExecutor && (
                                <div className="text-emerald-300 font-bold mt-0.5">
                                  Executor: {t.operadorExecutor}
                                </div>
                              )}
                              <div className="text-slate-400 text-[9px] mt-0.5">
                                Conf: {t.conferente || 'ADM'}
                              </div>
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenRedelegateModal(t)}
                                className="px-2 py-1 bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 border border-purple-700/40 rounded text-[9px] font-bold uppercase cursor-pointer"
                              >
                                Re-delegar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── TAB: IMPORTAR PLACAS (03.11.49.02) UNIFICADO ── */}
      {panelTab === 'import_placas' && (
        <div className="flex flex-col gap-6">
          <div className="g-card p-6 flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
              <div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-[#f5a623] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  Importar Placas — Relatório 03.11.49.02 (EFC Expedição & EFD Descarregamento)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Importação unificada da frota diária. As placas importadas hoje para expedição (EFC) transitam automaticamente para a fila de descarregamento (EFD) e ciclo de pernoites D1–D4 sem necessidade de reimportação.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAvulsaModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Placa Avulsa</span>
                </button>

                <label className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  <span>Importar Placas (03.11.49.02)</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>

                <label className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 shadow-md transition-all">
                  <Upload className="w-4 h-4 text-sky-200" />
                  <span>Importar Placas Apenas para EFD (Descarregamento)</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUploadEFD} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="bg-[#151b23] hover:bg-[#1c2530] text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Carregar Exemplo Pau Brasil Guarabira</span>
                </button>
              </div>
            </div>

            {/* KPI METRICS OVERVIEW */}
            {(() => {
              const efcMetrics = calculateEfcMetrics(efcVehicles);
              const efdMetrics = calculateEfdMetrics(efcVehicles);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#151b23] border border-[#222d3a] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Placas Importadas</span>
                    <span className="text-2xl font-black text-white mt-1">{efcVehicles.length} <span className="text-xs font-normal text-slate-400">veículos</span></span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#151b23] border border-amber-500/30 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Índice EFC Realizado (≤ 06:30)</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${(efcMetrics?.efcReal ?? 100) >= 96 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {(efcMetrics?.efcReal ?? 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Meta: ≥ 96.0%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#151b23] border border-emerald-500/30 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Índice EFD Realizado (≤ 22:00)</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${(efdMetrics?.efdReal ?? 100) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {(efdMetrics?.efdReal ?? 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Meta: ≥ 90.0%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#151b23] border border-[#222d3a] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placas em Pernoite (D1–D4)</span>
                    <span className="text-2xl font-black text-amber-300 mt-1">{efdMetrics.pernoites} <span className="text-xs font-normal text-slate-400">isentas</span></span>
                  </div>
                </div>
              );
            })()}

            {/* FILTER BAR */}
            <div className="p-3.5 bg-[#0d1218] border border-amber-500/30 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
                  <Filter className="w-3.5 h-3.5" /> Visão / Filtro:
                </span>
                {(['Todos', 'EFC', 'EFD', 'Pernoites'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setImportTableFilter(f)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all cursor-pointer ${
                      importTableFilter === f
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-[#151b23] text-slate-400 hover:text-white border border-[#222d3a]'
                    }`}
                  >
                    {f === 'Todos' ? 'Todas as Placas' : f === 'EFC' ? 'Expedição (EFC)' : f === 'EFD' ? 'Descarregamento (EFD)' : 'Pernoites (D1-D4)'}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Buscar placa/mapa..."
                  value={placaSearchFilter}
                  onChange={e => setPlacaSearchFilter(e.target.value)}
                  className="bg-[#151b23] border border-[#222d3a] text-white text-xs px-3 py-1.5 rounded-lg ml-auto focus:border-amber-400 font-mono w-full sm:w-56"
                />
              </div>
            </div>

            {/* DYNAMIC TABLE OF IMPORTED VEHICLES */}
            <div className="overflow-x-auto border border-[#222d3a] rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#11151c] text-[#f5a623] uppercase text-[10px] font-black tracking-wider border-b border-[#222d3a]">
                  {importTableFilter === 'EFC' ? (
                    <tr>
                      <th className="p-3">Placa / Veículo</th>
                      <th className="p-3">Data / Mapa</th>
                      <th className="p-3 text-center">Classificação (Rota / Recarga)</th>
                      <th className="p-3 text-center">Status EFC (≤ 06:30)</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  ) : importTableFilter === 'EFD' ? (
                    <tr>
                      <th className="p-3">Placa / Veículo</th>
                      <th className="p-3">Data / Mapa</th>
                      <th className="p-3 text-center">Classificação Pernoite</th>
                      <th className="p-3 text-center">Status EFD (≤ 22:00)</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  ) : importTableFilter === 'Pernoites' ? (
                    <tr>
                      <th className="p-3">Placa / Veículo</th>
                      <th className="p-3">Data / Mapa</th>
                      <th className="p-3 text-center">Classificação Pernoite</th>
                      <th className="p-3 text-center">Status Pernoite / EFD</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-3">Placa / Veículo</th>
                      <th className="p-3">Data / Mapa</th>
                      <th className="p-3 text-center">Classificação Recarga</th>
                      <th className="p-3 text-center">Classificação Pernoite</th>
                      <th className="p-3 text-center">Status EFC (≤ 06:30)</th>
                      <th className="p-3 text-center">Status EFD (≤ 22:00)</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#222d3a]/60 bg-[#151b23]/40">
                  {efcVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={importTableFilter === 'Todos' ? 7 : 5} className="p-8 text-center text-slate-500 font-medium">
                        Nenhum veículo importado na base. Clique em "Adicionar Placa Avulsa", "Importar Placas (03.11.49.02)" ou "Carregar Exemplo Pau Brasil Guarabira".
                      </td>
                    </tr>
                  ) : (
                    efcVehicles
                      .filter(v => {
                        if (placaSearchFilter) {
                          const q = placaSearchFilter.trim().toUpperCase();
                          const matchesPlaca = v.placa.toUpperCase().includes(q);
                          const matchesMapa = v.mapa.toUpperCase().includes(q);
                          const matchesMotorista = (v.motorista || '').toUpperCase().includes(q);
                          if (!matchesPlaca && !matchesMapa && !matchesMotorista) return false;
                        }
                        if (importTableFilter === 'EFC') {
                          return !(v.isRecarga || v.tipoCarga === 'Recarga');
                        }
                        if (importTableFilter === 'EFD') {
                          return !v.pernoiteMarked && v.statusDescarregamento !== 'Pernoite';
                        }
                        if (importTableFilter === 'Pernoites') {
                          return v.pernoiteMarked || v.statusDescarregamento === 'Pernoite';
                        }
                        return true;
                      })
                      .map(v => (
                        <tr key={`placa_conf_${v.id}`} className="hover:bg-[#1c2530]/50 transition-colors">
                          <td className="p-3 font-mono font-black text-amber-300 text-sm">
                            {v.placa}
                            <span className="block text-[10px] font-sans font-normal text-slate-400">{v.tipoVeiculo}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-200 block font-medium">{v.dataEntrega}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Mapa: {v.mapa}</span>
                          </td>

                          {/* EFC VIEW SPECIFIC COLUMNS */}
                          {importTableFilter === 'EFC' && (
                            <>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRecarga(v.id)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 mx-auto cursor-pointer transition-all ${
                                    v.isRecarga || v.tipoCarga === 'Recarga'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {v.isRecarga || v.tipoCarga === 'Recarga' ? '🔄 Recarga' : '🚚 Rota Regular'}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                {v.isRecarga ? (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                                    Isento EFC
                                  </span>
                                ) : v.statusCarregamento === 'Finalizado' ? (
                                  v.efcCompliant ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ✅ No Prazo
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ❌ Fora Prazo
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {v.statusCarregamento}
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* EFD VIEW SPECIFIC COLUMNS */}
                          {importTableFilter === 'EFD' && (
                            <>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePernoite(v.id)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 mx-auto cursor-pointer transition-all ${
                                    v.pernoiteMarked
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                                      : 'bg-[#151b23] text-slate-400 border border-[#222d3a] hover:text-white'
                                  }`}
                                >
                                  🌙 {v.pernoiteMarked ? `Pernoite (${v.pernoiteStatus || 'D1'})` : 'Classificar Pernoite'}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                {v.statusDescarregamento === 'Finalizado' ? (
                                  v.efdCompliant ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ✅ No Prazo
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ❌ Atrasado
                                    </span>
                                  )
                                ) : v.pernoiteMarked || v.statusDescarregamento === 'Pernoite' ? (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    🌙 Transita ({v.pernoiteStatus || 'D1'})
                                  </span>
                                ) : (
                                  <span className="bg-slate-700/50 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {v.statusDescarregamento}
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* PERNOITES VIEW SPECIFIC COLUMNS */}
                          {importTableFilter === 'Pernoites' && (
                            <>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePernoite(v.id)}
                                  className="px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 mx-auto cursor-pointer transition-all bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                                >
                                  🌙 Pernoite ({v.pernoiteStatus || 'D1'})
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  🌙 Pernoite ({v.pernoiteStatus || 'D1'})
                                </span>
                              </td>
                            </>
                          )}

                          {/* TODOS VIEW COLUMNS */}
                          {importTableFilter === 'Todos' && (
                            <>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRecarga(v.id)}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer transition-all ${
                                    v.isRecarga || v.tipoCarga === 'Recarga'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                                      : 'bg-[#151b23] text-slate-400 border border-[#222d3a] hover:text-white'
                                  }`}
                                >
                                  🔄 {v.isRecarga || v.tipoCarga === 'Recarga' ? 'Recarga Ativa' : 'Recarga'}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePernoite(v.id)}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer transition-all ${
                                    v.pernoiteMarked
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                                      : 'bg-[#151b23] text-slate-400 border border-[#222d3a] hover:text-white'
                                  }`}
                                >
                                  🌙 {v.pernoiteMarked ? `Pernoite (${v.pernoiteStatus || 'D1'})` : 'Pernoite'}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                {v.isRecarga ? (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                                    Isento EFC
                                  </span>
                                ) : v.statusCarregamento === 'Finalizado' ? (
                                  v.efcCompliant ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ✅ No Prazo
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ❌ Fora Prazo
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {v.statusCarregamento}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {v.statusDescarregamento === 'Finalizado' ? (
                                  v.efdCompliant ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ✅ No Prazo
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ❌ Atrasado
                                    </span>
                                  )
                                ) : v.pernoiteMarked || v.statusDescarregamento === 'Pernoite' ? (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    🌙 Transita ({v.pernoiteStatus || 'D1'})
                                  </span>
                                ) : (
                                  <span className="bg-slate-700/50 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {v.statusDescarregamento}
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditVehicle(v)}
                                className="p-1.5 text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg bg-transparent border-none cursor-pointer transition-all"
                                title="Editar Dados da Placa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(v.id, v.placa)}
                                className="p-1.5 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg bg-transparent border-none cursor-pointer transition-all"
                                title="Excluir Placa Importada"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Placa */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-amber-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Editar Dados da Placa: {editingVehicle.placa}
              </h3>
              <button
                onClick={() => setEditingVehicle(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Placa *</label>
                <input
                  type="text"
                  value={editPlaca}
                  onChange={e => setEditPlaca(e.target.value)}
                  className="g-input uppercase font-mono font-bold text-amber-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mapa</label>
                <input
                  type="text"
                  value={editMapa}
                  onChange={e => setEditMapa(e.target.value)}
                  className="g-input font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Veículo</label>
                <select
                  value={editTipoVeiculo}
                  onChange={e => setEditTipoVeiculo(e.target.value)}
                  className="g-input bg-[#151b23]"
                >
                  <option value="Truck">Truck</option>
                  <option value="Toco">Toco</option>
                  <option value="Carreta">Carreta</option>
                  <option value="VUC">VUC</option>
                  <option value="Bitrem">Bitrem</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Caixas / Paletes</label>
                <input
                  type="number"
                  value={editCaixas}
                  onChange={e => setEditCaixas(e.target.value === '' ? '' : Number(e.target.value))}
                  className="g-input font-mono"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motorista</label>
                <input
                  type="text"
                  value={editMotorista}
                  onChange={e => setEditMotorista(e.target.value)}
                  className="g-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Entrega</label>
                <input
                  type="text"
                  value={editDataEntrega}
                  onChange={e => setEditDataEntrega(e.target.value)}
                  className="g-input"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Classificação Carga</label>
                <select
                  value={editTipoCarga}
                  onChange={e => setEditTipoCarga(e.target.value)}
                  className="g-input bg-[#151b23]"
                >
                  <option value="Rota Comercial">Rota Comercial</option>
                  <option value="Recarga">Recarga</option>
                  <option value="Terceiros">Terceiros</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222d3a]">
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="px-4 py-2 bg-[#151b23] hover:bg-[#1c2530] text-slate-300 font-bold text-xs uppercase rounded-xl border border-[#222d3a] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditVehicle}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Placa Avulsa */}
      {showAddAvulsaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#11151c] border border-emerald-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar Placa Avulsa Manualmente
              </h3>
              <button
                onClick={() => setShowAddAvulsaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Placa da Veículo *</label>
                <input
                  type="text"
                  placeholder="Ex: ABC1D23"
                  value={avulsaPlaca}
                  onChange={e => setAvulsaPlaca(e.target.value)}
                  className="g-input uppercase font-mono font-bold text-emerald-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mapa (Opcional)</label>
                <input
                  type="text"
                  placeholder="M-AVULSA"
                  value={avulsaMapa}
                  onChange={e => setAvulsaMapa(e.target.value)}
                  className="g-input font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Veículo</label>
                <select
                  value={avulsaTipoVeiculo}
                  onChange={e => setAvulsaTipoVeiculo(e.target.value)}
                  className="g-input bg-[#151b23]"
                >
                  <option value="Truck">Truck</option>
                  <option value="Toco">Toco</option>
                  <option value="Carreta">Carreta</option>
                  <option value="VUC">VUC</option>
                  <option value="Bitrem">Bitrem</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade Caixas / Paletes</label>
                <input
                  type="number"
                  placeholder="0"
                  value={avulsaCaixas}
                  onChange={e => setAvulsaCaixas(e.target.value === '' ? '' : Number(e.target.value))}
                  className="g-input font-mono"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motorista (Opcional)</label>
                <input
                  type="text"
                  placeholder="Motorista Avulso"
                  value={avulsaMotorista}
                  onChange={e => setAvulsaMotorista(e.target.value)}
                  className="g-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Classificação Carga</label>
                <select
                  value={avulsaTipoCarga}
                  onChange={e => setAvulsaTipoCarga(e.target.value as any)}
                  className="g-input bg-[#151b23]"
                >
                  <option value="Rota Comercial">Rota Comercial</option>
                  <option value="Recarga">Recarga</option>
                  <option value="Terceiros">Terceiros</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Designar Empilhador</label>
                <select
                  value={avulsaOperador}
                  onChange={e => setAvulsaOperador(e.target.value)}
                  className="g-input bg-[#151b23]"
                >
                  <option value="">TODOS OS EMPILHADORES</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222d3a]">
              <button
                type="button"
                onClick={() => setShowAddAvulsaModal(false)}
                className="px-4 py-2 bg-[#151b23] hover:bg-[#1c2530] text-slate-300 font-bold text-xs uppercase rounded-xl border border-[#222d3a] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAddAvulsa}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl shadow cursor-pointer"
              >
                Adicionar Placa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Re-delegar Operadores TMR */}
      {redelegateDemand && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#151b23] border border-[#222d3a] rounded-2xl p-6 max-w-lg w-full flex flex-col gap-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#222d3a] pb-3">
              <div>
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Re-delegar Operadores — {redelegateDemand.carreta}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione um ou mais operadores para realizar a operação TMR na carreta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRedelegateDemand(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-[#0d1218] border border-[#1c2530]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Operadores de Empilhadeira Disponíveis:
              </label>

              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto p-2 bg-[#0d1218] border border-[#1c2530] rounded-xl">
                <button
                  type="button"
                  onClick={() => setRedelegateOps([])}
                  className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                    redelegateOps.length === 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-[#151b23] text-slate-400 hover:text-white border border-[#1c2530]'
                  }`}
                >
                  <span>TODOS OS EMPILHADORES (Qualquer operador pode assumir)</span>
                  {redelegateOps.length === 0 && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>

                {operators.map(op => {
                  const isChecked = redelegateOps.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setRedelegateOps(prev => prev.filter(x => x !== op));
                        } else {
                          setRedelegateOps(prev => [...prev, op]);
                        }
                      }}
                      className={`p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                          : 'bg-[#151b23] text-slate-300 hover:text-white border border-[#1c2530]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        {op}
                      </span>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222d3a]">
              <button
                type="button"
                onClick={() => setRedelegateDemand(null)}
                className="px-4 py-2 bg-[#0d1218] hover:bg-[#1c2530] text-slate-300 font-bold text-xs uppercase rounded-xl border border-[#222d3a] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRedelegation}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Re-delegação
              </button>
            </div>
          </div>
        </div>
      )}
      {panelTab === 'validade' && (
        <ValidadesPanel user={user} empresa={empresa} hideSugerirMelhoria={true} />
      )}

      {panelTab === 'temperatura' && (
        <div className="flex flex-col gap-6">
          {/* Header Card */}
          <div className="g-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-950/20 via-[#151b23] to-[#151b23]">
            <div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Controle & Monitoramento de Temperatura do Armazém
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Aferição obrigatória de temperatura nos horários programados da plataforma (<strong>09:00, 16:00 e 22:00</strong>). Os registros são associados ao usuário logado.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Faixa Segura: 18.0°C a 28.0°C
              </span>
            </div>
          </div>

          {/* Import / Export / Clear Bar */}
          <TemperaturaImportExportBar onDataChanged={reloadTempLogs} />

          {/* Schedule Alerts Header Cards */}
          {(() => {
            const todayISO = new Date().toISOString().split('T')[0];
            const todayLogs = tempLogs.filter(l => l.dataISO === todayISO);
            const log09 = todayLogs.find(l => l.hora === '09:00');
            const log16 = todayLogs.find(l => l.hora === '16:00');
            const log22 = todayLogs.find(l => l.hora === '22:00');

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 09:00 Alert Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  log09 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider font-mono">
                      ⏰ Horário 09:00
                    </span>
                    {log09 ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                        ✅ OK ({log09.temperatura}°C)
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                        ⚠️ Pendente
                      </span>
                    )}
                  </div>
                  {log09 ? (
                    <div className="text-[11px] text-slate-300 font-medium">
                      Registrado por <strong>{log09.registradoPor || log09.conferenteNome}</strong> ({log09.temperatura}°C)
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-200">Aferição matutina pendente</span>
                      <button
                        type="button"
                        onClick={() => { setTempHora('09:00'); setTempDataISO(todayISO); }}
                        className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded cursor-pointer uppercase tracking-wider"
                      >
                        Registrar 09:00
                      </button>
                    </div>
                  )}
                </div>

                {/* 16:00 Alert Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  log16 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider font-mono">
                      ⏰ Horário 16:00
                    </span>
                    {log16 ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                        ✅ OK ({log16.temperatura}°C)
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                        ⚠️ Pendente
                      </span>
                    )}
                  </div>
                  {log16 ? (
                    <div className="text-[11px] text-slate-300 font-medium">
                      Registrado por <strong>{log16.registradoPor || log16.conferenteNome}</strong> ({log16.temperatura}°C)
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-200">Aferição vespertina pendente</span>
                      <button
                        type="button"
                        onClick={() => { setTempHora('16:00'); setTempDataISO(todayISO); }}
                        className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded cursor-pointer uppercase tracking-wider"
                      >
                        Registrar 16:00
                      </button>
                    </div>
                  )}
                </div>

                {/* 22:00 Alert Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  log22 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider font-mono">
                      ⏰ Horário 22:00
                    </span>
                    {log22 ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                        ✅ OK ({log22.temperatura}°C)
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                        ⚠️ Pendente
                      </span>
                    )}
                  </div>
                  {log22 ? (
                    <div className="text-[11px] text-slate-300 font-medium">
                      Registrado por <strong>{log22.registradoPor || log22.conferenteNome}</strong> ({log22.temperatura}°C)
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-200">Aferição noturna pendente</span>
                      <button
                        type="button"
                        onClick={() => { setTempHora('22:00'); setTempDataISO(todayISO); }}
                        className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded cursor-pointer uppercase tracking-wider"
                      >
                        Registrar 22:00
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Form to Register Temperature */}
          <form onSubmit={handleSaveTempLog} className="g-card p-6 flex flex-col gap-4">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-400" />
              Lançar / Atualizar Registro de Temperatura do Armazém
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data da Medição *</label>
                <input 
                  type="date"
                  value={tempDataISO}
                  onChange={e => setTempDataISO(e.target.value)}
                  className="g-input font-mono text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Horário Programado *</label>
                <select 
                  value={tempHora}
                  onChange={e => setTempHora(e.target.value)}
                  className="g-input bg-[#151b23] font-mono text-xs font-bold text-rose-300"
                  required
                >
                  <option value="07:00">07:00 (Início de Turno)</option>
                  <option value="09:00">09:00 (Mandatório Padrão)</option>
                  <option value="11:00">11:00 (Horário Intermediário)</option>
                  <option value="14:00">14:00 (Pico de Calor)</option>
                  <option value="16:00">16:00 (Mandatório Padrão)</option>
                  <option value="19:00">19:00 (Troca de Turno)</option>
                  <option value="22:00">22:00 (Mandatório Padrão)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Temperatura (°C) *</label>
                <input 
                  type="number"
                  step="0.1"
                  placeholder="Ex: 23.5"
                  value={tempValor}
                  onChange={e => setTempValor(e.target.value)}
                  className="g-input font-mono font-bold text-rose-400 text-center text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Usuário Responsável (Conferente / ADM)</label>
                <input 
                  type="text"
                  disabled
                  value={`${user?.nome || conferente || 'Conferente Responsável'} (${user?.cargo || 'Conferente / ADM'})`}
                  className="g-input bg-[#11151c] text-slate-400 font-bold text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Observação / Justificativa em caso de desvio</label>
                <input 
                  type="text"
                  placeholder="Ex: Climatização operando normalmente / Portas mantidas fechadas"
                  value={tempObs}
                  onChange={e => setTempObs(e.target.value)}
                  className="g-input text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Thermometer className="w-4 h-4" />
              💾 SALVAR AFERIÇÃO DE TEMPERATURA COM CARIMBO DE USUÁRIO
            </button>
          </form>

          {/* Table of Historic Logs */}
          <div className="g-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Histórico de Aferições Registradas ({tempLogs.length})
              </h4>
            </div>

            {tempLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhuma aferição de temperatura registrada até o momento. Use o formulário acima para realizar o primeiro lançamento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222d3a] text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Temperatura</th>
                      <th className="p-3">Registrado Por</th>
                      <th className="p-3">Observação</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2733] text-xs">
                    {tempLogs.map(log => {
                      const isDanger = log.alertaCritico || log.temperatura > 28.0 || log.temperatura < 18.0;

                      return (
                        <tr key={log.id} className="hover:bg-[#151b23]/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-white">
                            {log.dataFormatted} <span className="text-amber-400 ml-1">({log.hora})</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg border ${
                              isDanger 
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            }`}>
                              {log.temperatura}°C {isDanger ? '⚠️ DESVIO' : '✅ OK'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-200 font-bold">
                            {log.registradoPor || log.conferenteNome}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px] truncate max-w-xs">
                            {log.observacao || '—'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTempLog(log.id)}
                              className="text-[10px] font-bold text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: WLP & APONTAMENTO DE TURNO (MONTAGEM / NOITE & DIA) ── */}
      {panelTab === 'wlp' && (
        <div className="flex flex-col gap-6">
          {/* Header Banner */}
          <div className="g-card p-6 border-l-4 border-amber-500 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-sans font-black text-lg text-white uppercase tracking-wide">
                  Apontamento WLP & Horário de Montagem por Turno
                </h3>
                <p className="text-xs text-slate-300">
                  Cadastre o horário de início e término da montagem (turno da noite), volume faturado em hectolitros (HL) e colaboradores adicionais para calcular o WLP e média de horas trabalhadas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#151b23] p-2 rounded-lg border border-[#222d3a]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status do Apontamento:</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/30">
                ATIVO ({wlpTurno})
              </span>
            </div>
          </div>

          {/* Form Principal de Apontamento de Turno */}
          <form onSubmit={handleSaveWlpShift} className="g-card p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-3">
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                1. Configuração do Turno & Faturamento Diário
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data do Apontamento *</label>
                <input 
                  type="date"
                  value={wlpDataISO}
                  onChange={e => setWlpDataISO(e.target.value)}
                  className="g-input text-xs font-bold font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Turno de Operação *</label>
                <select 
                  value={wlpTurno}
                  onChange={e => setWlpTurno(e.target.value as 'Noite' | 'Dia')}
                  className="g-input text-xs font-bold bg-[#11151c] text-white"
                >
                  <option value="Noite">🌙 Turno Noite (Armazém Noturno / Montagem)</option>
                  <option value="Dia">☀️ Turno Dia (Armazém Diurno / Presença)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-amber-400 uppercase flex items-center justify-between">
                  <span>Volume Faturado do Turno (HL) {wlpTurno === 'Noite' ? '*' : '(Opcional/Noturno)'}</span>
                  {wlpTurno === 'Dia' && <span className="text-[9px] text-slate-400 font-normal">Preenchido pelo Conferente Noturno</span>}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    placeholder={wlpTurno === 'Noite' ? "Ex: 680.5" : "Opcional no Turno Diurno"}
                    value={wlpVolumeHL}
                    onChange={e => setWlpVolumeHL(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={wlpTurno === 'Dia'}
                    className={`g-input text-sm font-bold font-mono text-amber-300 pr-12 ${wlpTurno === 'Dia' ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''}`}
                    required={wlpTurno === 'Noite'}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-500">HL</span>
                </div>
              </div>
            </div>

            {/* SE O TURNO FOR NOITE (MONTAGEM / ARMAZÉM NOTURNO) */}
            {wlpTurno === 'Noite' ? (
              <div className="p-5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h5 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300">
                        Equipe do Armazém Noturno & Apontamento de Presença
                      </h5>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Clique sobre o colaborador para indicar quem veio <strong>(Presente)</strong> ou não veio <strong>(Falta)</strong> no turno.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllNight}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedNightColabs.length === EQUIPE_NOTURNA_PADRAO.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                {/* Team Grid Clicável */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {EQUIPE_NOTURNA_PADRAO.map(colab => {
                    const isPresent = selectedNightColabs.includes(colab.nome);
                    return (
                      <button
                        type="button"
                        key={colab.nome}
                        onClick={() => handleToggleNightColab(colab.nome)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isPresent
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isPresent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {colab.cargo}
                          </span>
                          {isPresent ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold leading-tight ${isPresent ? 'text-white' : 'text-slate-500'}`}>
                            {colab.apelido}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-full" title={colab.nome}>
                            {colab.nome.split(' ')[0]} {colab.nome.split(' ').slice(-1)[0]}
                          </div>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-wider text-right ${
                          isPresent ? 'text-emerald-400' : 'text-rose-400/80'
                        }`}>
                          {isPresent ? '✓ Presente' : '✕ Ausente'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                      <span>Início da Montagem (HH:MM) *</span>
                      {isShiftTimeLocked && <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1 rounded">🔒 Iniciado</span>}
                    </label>
                    <input 
                      type="time"
                      value={wlpHoraInicioMontagem}
                      onChange={e => setWlpHoraInicioMontagem(e.target.value)}
                      disabled={isShiftTimeLocked}
                      className={`g-input text-xs font-mono font-bold text-indigo-200 ${isShiftTimeLocked ? 'opacity-60 bg-slate-900 cursor-not-allowed' : ''}`}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase">Término da Montagem (HH:MM) *</label>
                    <input 
                      type="time"
                      value={wlpHoraFimMontagem}
                      onChange={e => setWlpHoraFimMontagem(e.target.value)}
                      className="g-input text-xs font-mono font-bold text-indigo-200"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase">Total Presentes (Auto-calculado)</label>
                    <div className="g-input text-xs font-mono font-black text-emerald-400 flex items-center justify-between bg-slate-900">
                      <span>{selectedNightColabs.length} Colaboradores</span>
                      <span className="text-[9px] text-slate-400 font-normal">({EQUIPE_NOTURNA_PADRAO.length} Total)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#11151c] p-3 rounded-lg border border-[#222d3a] text-xs">
                  <span className="text-slate-400">Duração Calculada por Colaborador:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {calcShiftHours(wlpHoraInicioMontagem, wlpHoraFimMontagem)}h
                  </span>
                  <span className="text-slate-400 ml-4">Subtotal HH Noturno ({selectedNightColabs.length} colabs):</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {(calcShiftHours(wlpHoraInicioMontagem, wlpHoraFimMontagem) * selectedNightColabs.length).toFixed(1)} HH
                  </span>
                </div>

                {/* BOTÃO DE TRANSITION DE MONTAGEM PARA O DIURNO */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 bg-amber-950/25 border border-amber-500/40 rounded-xl mt-1">
                  <div>
                    <span className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> Transição de Montagem para o Turno Diurno
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Caso a equipe da noite não conclua a montagem, clique para encerrar a jornada dos colaboradores noturnos na hora atual e repassar a finalização da montagem para a equipe da manhã.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTransferMontagemToDay}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                    <span>Transferir Montagem para o Diurno</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TURNO DIURNO - LISTA DE PRESENÇA */
              <div className="p-5 bg-sky-950/20 border border-sky-500/30 rounded-xl flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    <div>
                      <h5 className="font-sans font-bold text-xs uppercase tracking-wider text-sky-300">
                        Equipe do Armazém Diurno & Lista de Presença
                      </h5>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Selecione os colaboradores que compareceram no turno diurno para cálculo de homem-hora (HH) no WLP.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllDay}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedDayColabs.length === EQUIPE_DIURNA_PADRAO.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                {/* Team Grid Clicável Diurno */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {EQUIPE_DIURNA_PADRAO.map(colab => {
                    const isPresent = selectedDayColabs.includes(colab.nome);
                    return (
                      <button
                        type="button"
                        key={colab.nome}
                        onClick={() => handleToggleDayColab(colab.nome)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isPresent
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isPresent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {colab.cargo}
                          </span>
                          {isPresent ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold leading-tight ${isPresent ? 'text-white' : 'text-slate-500'}`}>
                            {colab.apelido}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-full" title={colab.nome}>
                            {colab.nome.split(' ')[0]} {colab.nome.split(' ').slice(-1)[0]}
                          </div>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-wider text-right ${
                          isPresent ? 'text-emerald-400' : 'text-rose-400/80'
                        }`}>
                          {isPresent ? '✓ Presente' : '✕ Ausente'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                      <span>Início da Jornada Diurna (HH:MM) *</span>
                      {isShiftTimeLocked && <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1 rounded">🔒 Iniciado</span>}
                    </label>
                    <input 
                      type="time"
                      value={wlpHoraInicioMontagem}
                      onChange={e => setWlpHoraInicioMontagem(e.target.value)}
                      disabled={isShiftTimeLocked}
                      className={`g-input text-xs font-mono font-bold text-sky-200 ${isShiftTimeLocked ? 'opacity-60 bg-slate-900 cursor-not-allowed' : ''}`}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase">Término da Jornada Diurna (HH:MM) *</label>
                    <input 
                      type="time"
                      value={wlpHoraFimMontagem}
                      onChange={e => setWlpHoraFimMontagem(e.target.value)}
                      className="g-input text-xs font-mono font-bold text-sky-200"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase">Total Presentes (Diurno)</label>
                    <div className="g-input text-xs font-mono font-black text-sky-400 flex items-center justify-between bg-slate-900">
                      <span>{selectedDayColabs.length} Colaboradores</span>
                      <span className="text-[9px] text-slate-400 font-normal">({EQUIPE_DIURNA_PADRAO.length} Total)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO: ADICIONAR COLABORADOR EXTRA NO CÁLCULO DA JORNADA */}
            <div className="border border-[#222d3a] rounded-xl p-5 bg-[#151b23]/80 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#222d3a] pb-2">
                <h5 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  2. Adicionar Colaborador Extra no Cálculo do WLP
                </h5>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Campo Expansível de Jornada
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Colaborador Extra *</label>
                  <input 
                    type="text"
                    placeholder="Ex: CARLOS ALBERTO MEDEIROS"
                    value={extraNome}
                    onChange={e => setExtraNome(e.target.value)}
                    className="g-input text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo / Função</label>
                  <select 
                    value={extraCargo}
                    onChange={e => setExtraCargo(e.target.value as any)}
                    className="g-input text-xs bg-[#11151c]"
                  >
                    <option value="Ajudante">Ajudante</option>
                    <option value="Empilhador">Empilhador</option>
                    <option value="Conferente">Conferente</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                    <input 
                      type="time"
                      value={extraHoraInicio}
                      onChange={e => setExtraHoraInicio(e.target.value)}
                      className="g-input text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                    <input 
                      type="time"
                      value={extraHoraFim}
                      onChange={e => setExtraHoraFim(e.target.value)}
                      className="g-input text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddExtraColab}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Incluir Colaborador no Cálculo ({calcShiftHours(extraHoraInicio, extraHoraFim)}h)
                </button>
              </div>

              {/* LISTA DE COLABORADORES EXTRAS ADICIONADOS */}
              {wlpExtraColabs.length > 0 && (
                <div className="mt-2 overflow-x-auto border border-[#222d3a] rounded-lg bg-[#11151c]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222d3a] text-[10px] font-black uppercase text-slate-400">
                        <th className="p-2.5">Colaborador Extra</th>
                        <th className="p-2.5">Cargo</th>
                        <th className="p-2.5">Horário Início / Fim</th>
                        <th className="p-2.5">Duração (HH)</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2733]">
                      {wlpExtraColabs.map(ext => (
                        <tr key={ext.id}>
                          <td className="p-2.5 font-bold text-white">{ext.nome}</td>
                          <td className="p-2.5 text-slate-300">{ext.cargo}</td>
                          <td className="p-2.5 font-mono text-amber-300">{ext.horaInicio} às {ext.horaFim}</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-400">{ext.duracaoHoras}h</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraColab(ext.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PREVISÃO DE MÉDIA DE HORAS E WLP RESULTANTE */}
            {(() => {
              const baseColabsCount = wlpTurno === 'Noite' ? selectedNightColabs.length : selectedDayColabs.length;
              const baseHH = calcShiftHours(wlpHoraInicioMontagem, wlpHoraFimMontagem) * baseColabsCount;
              const extraHH = wlpExtraColabs.reduce((acc, c) => acc + c.duracaoHoras, 0);
              const totalHH = baseHH + extraHH;
              const totalColabs = baseColabsCount + wlpExtraColabs.length;
              const avgHours = totalColabs > 0 ? totalHH / totalColabs : 0;
              const volHL = Number(wlpVolumeHL) || 0;
              const wlpRatio = totalHH > 0 ? volHL / totalHH : 0;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-900/80 border border-[#222d3a] rounded-xl text-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Volume Informado</span>
                    <span className="font-mono font-black text-base text-amber-400">{volHL.toFixed(1)} HL</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Homem-Hora (HH)</span>
                    <span className="font-mono font-black text-base text-sky-400">{totalHH.toFixed(1)} HH</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Média de Horas / Colab</span>
                    <span className="font-mono font-black text-base text-indigo-400">{avgHours.toFixed(2)}h</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Indicador WLP (HL/HH)</span>
                    <span className="font-mono font-black text-base text-emerald-400">{wlpRatio.toFixed(2)} HL/HH</span>
                  </div>
                </div>
              );
            })()}

            <button
              type="submit"
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              💾 SALVAR APONTAMENTO DO TURNO & ATUALIZAR INDICADOR WLP OFICIAL
            </button>
          </form>
        </div>
      )}

      {/* ── ABA 7: REALIZAÇÃO DO 5S ── */}
      {panelTab === '5s' && (
        <div className="flex flex-col gap-6">
          <Collaborator5SPerformanceCard user={user} userNombre={user.nome} />

          <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#222d3a] pb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-amber-400" />
                  Realização do Checklist 5S — Operação Conferente
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Execute a auditoria de 5S no setor de conferência, recebimento e expedição para garantir a segurança e organização.
                </p>
              </div>
            </div>

            <Checklist5SForm 
              defaultSetor="ARMAZEM" 
              userNombre={user.nome} 
              user={user} 
              empresaId={empresaId} 
              liderAuditor="Conferente Líder"
              onSaveSuccess={() => {
                alert('✓ Audit 5S do Conferente registrado com sucesso!');
              }} 
            />
          </div>
        </div>
      )}

      {/* ── ABA 8: RETORNO DE ROTA ── */}
      {panelTab === 'retorno_rota' && (
        <div className="bg-[#11151c] border border-[#222d3a] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222d3a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-black uppercase tracking-wider text-white">
                  Retorno de Rota — Operação Conferente / ADM
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Link Oficial Anexado
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                O Conferente/ADM inicia a jornada, clica no link e é redirecionado diretamente para a plataforma de Retorno de Rota.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
                shiftStarted 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {shiftStarted ? `✓ Jornada Iniciada às ${shiftStartTime}` : '⚠️ Jornada Não Iniciada'}
              </span>
            </div>
          </div>

          {/* LINK ACCESSIBLE CARD */}
          <div className="bg-[#151b23] border border-emerald-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <Truck className="w-64 h-64 text-emerald-400" />
            </div>

            <div className="flex items-start gap-4 z-10">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                <ExternalLink className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  SISTEMA OFICIAL DE RETORNO DE ROTA
                </span>
                <h4 className="text-xl font-black text-white">
                  PLATAFORMA RETORNO DE ROTA DOS VEÍCULOS
                </h4>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Acesse o sistema externo definitivo para registro de chegada, conferência de vasilhames e checklists de prestação de contas de rotas.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-[#0d1117] px-3.5 py-2 rounded-xl border border-[#222d3a] w-fit">
                  <span className="text-emerald-400 font-bold">URL:</span>
                  <span className="text-emerald-300 underline">https://nixonhenriquegit.github.io/RETORNO-DE-ROTA/</span>
                </div>
              </div>
            </div>

            <a
              href="https://nixonhenriquegit.github.io/RETORNO-DE-ROTA/"
              target="_blank"
              rel="noopener noreferrer"
              className="z-10 py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-xl shadow-emerald-950/50 flex items-center gap-3 shrink-0 border border-emerald-300 hover:scale-105"
            >
              <span>ACESSAR PLATAFORMA DE RETORNO DE ROTA</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          {!shiftStarted && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <span>
                💡 <strong>Dica Operacional:</strong> Lembre-se de clicar em <strong>INICIAR JORNADA</strong> no topo da página ao começar seu turno para sincronizar seus apontamentos.
              </span>
              <button
                onClick={handleStartShift}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shrink-0 ml-2"
              >
                Iniciar Jornada
              </button>
            </div>
          )}
        </div>
      )}

      <SugerirMelhoriaCard user={user} empresa={empresa} setor="Conferente" />
    </div>
  );
}
export {};
