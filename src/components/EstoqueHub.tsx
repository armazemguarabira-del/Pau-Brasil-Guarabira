import React, { useState } from 'react';
import { Usuario } from '../types';
import GestaoCapacidadeDashboard from './GestaoCapacidadeDashboard';
import ImportacaoContagensPanel from './ImportacaoContagensPanel';
import GestaoContingenciaPanel from './GestaoContingenciaPanel';
import CurvaAbcVendaMediaPanel from './CurvaAbcVendaMediaPanel';
import MatrizAbcLogisticaPanel from './MatrizAbcLogisticaPanel';

interface EstoqueHubProps {
  user: Usuario;
  initialTab?: string;
}

export default function EstoqueHub({ user, initialTab = 'politica-estoque' }: EstoqueHubProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="space-y-6">
      {/* RENDER CURRENT TAB */}
      {activeTab === 'politica-estoque' && (
        <GestaoCapacidadeDashboard 
          user={user} 
          empresa={null}
          initialTab="politica-estoque"
        />
      )}

      {activeTab === 'importacao-contagens' && (
        <ImportacaoContagensPanel 
          user={user} 
        />
      )}

      {activeTab === 'area-contingencia' && (
        <GestaoContingenciaPanel 
          user={user} 
        />
      )}

      {activeTab === 'venda-media' && (
        <CurvaAbcVendaMediaPanel 
          user={user} 
        />
      )}

      {activeTab === 'matriz-abc-logistica' && (
        <MatrizAbcLogisticaPanel 
          user={user} 
        />
      )}
    </div>
  );
}
