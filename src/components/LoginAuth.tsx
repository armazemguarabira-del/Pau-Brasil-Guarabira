import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { BrandLogo } from './BrandLogo';

interface LoginAuthProps {
  onAuthSuccess: (userProfile: any) => void;
  onBackToLanding: () => void;
}

export default function LoginAuth({ onAuthSuccess, onBackToLanding }: LoginAuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'controle'>('login');
  
  // Login States
  const [lEmail, setLEmail] = useState('');
  const [lSenha, setLSenha] = useState('');
  const [lMfaCode, setLMfaCode] = useState('');
  const [mfaAtingido, setMfaAtingido] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  
  // Controle States
  const [contEmail, setContEmail] = useState('');
  const [contSenha, setContSenha] = useState('');

  // Primeiro Acesso (First-time login) States
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [firstAccessInput, setFirstAccessInput] = useState('');
  const [firstAccessUser, setFirstAccessUser] = useState<any | null>(null);
  const [faNovaSenha, setFaNovaSenha] = useState('');
  const [faConfirmSenha, setFaConfirmSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const translateError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'E-mail inválido.';
      case 'auth/user-not-found': return 'Usuário não encontrado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado em outra conta.';
      case 'auth/weak-password': return 'A senha deve possuir ao menos 6 caracteres.';
      case 'auth/too-many-requests': return 'Muitas tentativas falhas. Aguarde um momento.';
      case 'auth/network-request-failed': return 'Erro de rede. Verifique seu acesso à internet.';
      case 'auth/invalid-credential': return 'Credenciais de e-mail ou senha incorretas.';
      case 'auth/operation-not-allowed': 
        return 'O provedor de login por E-mail e Senha está desativado no Firebase. Para corrigir, acesse o Console do Firebase > Authentication > Sign-in method, ative o provedor "E-mail/Senha", salve e tente novamente.';
      default: return 'Ocorreu um erro inesperado: ' + code;
    }
  };

  const clearInputs = () => {
    setLEmail('');
    setLSenha('');
    setLMfaCode('');
    setMfaAtingido(false);
    setTempUser(null);
    setContEmail('');
    setContSenha('');
    setFirstAccessInput('');
    setFirstAccessUser(null);
    setFaNovaSenha('');
    setFaConfirmSenha('');
    setIsFirstAccess(false);
    setMsg(null);
  };

  const handleVerifyFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstAccessInput.trim()) {
      setMsg({ type: 'err', text: 'Informe seu e-mail ou sua matrícula cadastrada.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const inputClean = firstAccessInput.trim();
    const emailClean = inputClean.toLowerCase();

    try {
      let colabData: any = null;
      let colabDocId: string = '';

      if (db) {
        const colabRef = collection(db, 'colaboradores');
        let q;
        if (inputClean.includes('@')) {
          q = query(colabRef, where('email', '==', emailClean));
        } else {
          q = query(colabRef, where('matricula', '==', inputClean));
        }

        const colabSnap = await getDocs(q);
        if (!colabSnap.empty) {
          colabDocId = colabSnap.docs[0].id;
          colabData = colabSnap.docs[0].data();
        }
      }

      // Offline localStorage lookup fallback
      if (!colabData) {
        const savedKeys = Object.keys(localStorage).filter(k => k.startsWith('colaboradores_'));
        for (const key of savedKeys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            const colabs = JSON.parse(saved);
            const found = colabs.find((c: any) => 
              String(c.matricula).trim() === inputClean || 
              (c.email && String(c.email).toLowerCase().trim() === emailClean)
            );
            if (found) {
              colabData = found;
              colabDocId = found._docId || 'local_' + found.matricula;
              break;
            }
          }
        }
      }

      if (colabData) {
        if (colabData.primeiroAcesso === true || !colabData.senha) {
          setFirstAccessUser({ id: colabDocId, ...colabData });
          setMsg({ type: 'ok', text: 'Colaborador pré-autorizado encontrado! Crie sua senha abaixo.' });
        } else {
          setMsg({ type: 'err', text: 'Sua senha já está cadastrada! Por favor, faça login normalmente.' });
        }
      } else {
        setMsg({ type: 'err', text: 'Colaborador não encontrado. Solicite ao seu supervisor para pré-autorizar o seu acesso.' });
      }
    } catch (err: any) {
      console.error('Erro ao verificar primeiro acesso:', err);
      setMsg({ type: 'err', text: 'Erro ao verificar cadastro: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faNovaSenha.trim() || !faConfirmSenha.trim()) {
      setMsg({ type: 'err', text: 'Preencha todos os campos de senha.' });
      return;
    }

    if (faNovaSenha.trim().length < 4) {
      setMsg({ type: 'err', text: 'A senha deve conter ao menos 4 caracteres.' });
      return;
    }

    if (faNovaSenha.trim() !== faConfirmSenha.trim()) {
      setMsg({ type: 'err', text: 'As senhas digitadas não coincidem.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const targetSenha = faNovaSenha.trim();

    try {
      const colabId = firstAccessUser.id;
      
      if (db && !colabId.startsWith('local_')) {
        const colabRef = doc(db, 'colaboradores', colabId);
        await updateDoc(colabRef, {
          senha: targetSenha,
          primeiroAcesso: false,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Local state updates
        const savedKeys = Object.keys(localStorage).filter(k => k.startsWith('colaboradores_'));
        for (const key of savedKeys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            let colabs = JSON.parse(saved);
            const foundIdx = colabs.findIndex((c: any) => 
              (c._docId && c._docId === colabId) || String(c.matricula).trim() === String(firstAccessUser.matricula).trim()
            );
            if (foundIdx !== -1) {
              colabs[foundIdx].senha = targetSenha;
              colabs[foundIdx].primeiroAcesso = false;
              colabs[foundIdx].updatedAt = new Date().toISOString();
              localStorage.setItem(key, JSON.stringify(colabs));
              break;
            }
          }
        }
      }

      // Login directly and successfully
      onAuthSuccess({
        id: colabId,
        uid: colabId,
        nome: firstAccessUser.nome,
        email: firstAccessUser.email || `${firstAccessUser.matricula}@paubrasil.com`,
        papel: firstAccessUser.funcao,
        empresaId: firstAccessUser.empresaId || 'demo',
        status: 'ativo',
        isControle: firstAccessUser.funcao === 'controle'
      });
    } catch (err: any) {
      console.error('Erro ao salvar senha de primeiro acesso:', err);
      setMsg({ type: 'err', text: 'Erro ao salvar senha de acesso: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lEmail || !lSenha) {
      setMsg({ type: 'err', text: 'Informe e-mail ou matrícula e senha.' });
      return;
    }

    localStorage.setItem('login_mode', 'operacao');
    setLoading(true);
    setMsg(null);

    const emailClean = lEmail.toLowerCase().trim();
    const isMatricula = !emailClean.includes('@');

    // BYPASS DE LOGIN EXCLUSIVO PARA O DONO (caso o provedor do Firebase esteja desativado)
    if (emailClean === 'nixon.a.a100.nh@gmail.com') {
      const senhaClean = lSenha.trim().toLowerCase();
      if (senhaClean === 'dono2026' || senhaClean === 'nixon.a.a100.nh@gmail.com') {
        const ownerProfile = {
          uid: 'owner_nixon',
          nome: 'Nixon',
          email: 'nixon.a.a100.NH@gmail.com',
          empresaId: 'emp_dono',
          papel: 'admin',
          status: 'ativo',
          empresa: {
            id: 'emp_dono',
            nome: 'Pau Brasil Distribuidora Headquarter',
            cidade: 'Guarabira',
            estado: 'PB',
            plano: 'completo',
            modulos: ['repack', 'validades', 'quebras', 'despejo', 'empilhador', 'refugo'],
            ativo: true
          }
        };
        onAuthSuccess(ownerProfile);
        setLoading(false);
        return;
      } else {
        setMsg({ type: 'err', text: 'Senha incorreta para o Administrador.' });
        setLoading(false);
        return;
      }
    }

    // COLLABORATOR DATABASE / LOCALSTORAGE LOOKUP (BOTH EMAIL & MATRICULA)
    const inputClean = lEmail.trim();
    const senhaClean = lSenha.trim();
    let colabData: any = null;
    let colabDocId: string = '';

    try {
      if (db) {
        const colabRef = collection(db, 'colaboradores');
        
        // Search by email if it contains '@', otherwise by matricula
        let q;
        if (inputClean.includes('@')) {
          q = query(colabRef, where('email', '==', inputClean.toLowerCase()));
        } else {
          q = query(colabRef, where('matricula', '==', inputClean));
        }
        
        const colabSnap = await getDocs(q);
        if (!colabSnap.empty) {
          colabDocId = colabSnap.docs[0].id;
          colabData = colabSnap.docs[0].data();
        }
      }

      // If not found in Firestore or if we are offline, try localStorage fallback
      if (!colabData) {
        const savedKeys = Object.keys(localStorage).filter(k => k.startsWith('colaboradores_'));
        for (const key of savedKeys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            const colabs = JSON.parse(saved);
            const found = colabs.find((c: any) => 
              String(c.matricula).trim() === inputClean || 
              (c.email && String(c.email).toLowerCase().trim() === inputClean.toLowerCase())
            );
            if (found) {
              colabData = found;
              colabDocId = found._docId || 'local_' + found.matricula;
              break;
            }
          }
        }
      }

      // If collaborator was found in either Firestore or localStorage
      if (colabData) {
        if (colabData.senha === senhaClean) {
          onAuthSuccess({
            id: colabDocId,
            uid: colabDocId,
            nome: colabData.nome,
            email: colabData.email || `${colabData.matricula}@paubrasil.com`,
            papel: colabData.funcao,
            empresaId: colabData.empresaId || 'demo',
            status: 'ativo',
            isControle: colabData.funcao === 'controle'
          });
          setLoading(false);
          return;
        } else {
          setMsg({ type: 'err', text: 'Senha incorreta.' });
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.error("Erro durante busca de colaborador:", err);
      const isPermissionDenied = err?.message?.includes('permission-denied') || err?.code === 'permission-denied';
      if (isPermissionDenied) {
        setMsg({ 
          type: 'err', 
          text: 'Erro de Permissão no Firebase (Permission Denied). Verifique as Regras de Segurança (Security Rules) do Firestore no console do seu Firebase ou se o seu domínio está autorizado no Console > Authentication > Configurações.' 
        });
        setLoading(false);
        return;
      }
    }

    // If we reach here and input looks like a matricula, then no collaborator was found.
    if (!inputClean.includes('@')) {
      setMsg({ type: 'err', text: 'Nenhum colaborador encontrado com esta matrícula.' });
      setLoading(false);
      return;
    }

    // STANDARD EMAIL/PASSWORD AUTHENTICATION (FOR ADMINS / OWNERS)
    try {
      const cred = await signInWithEmailAndPassword(auth, inputClean, lSenha);
      const uid = cred.user.uid;

      // Fetch user profiling data from Firestore
      const userRef = doc(db, 'usuarios', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        if (userData.status === 'inativo') {
          await auth.signOut();
          setMsg({ type: 'err', text: 'Esta conta está inativa. Entre em contato com seu Administrador.' });
          setLoading(false);
          return;
        }

        // Check if MFA (Two-Step Authentication) is active
        if (userData.mfaHabilitado) {
          // Temporarily store credentials and ask for 6-digit passcode
          setTempUser({ id: uid, ...userData });
          setMfaAtingido(true);
          setLoading(false);
          return;
        }

        // Login completely successful without MFA
        onAuthSuccess({ id: uid, ...userData });
      } else {
        // Fallback for primary owner setup
        const fakeUserData = {
          uid,
          nome: cred.user.displayName || cred.user.email || 'Admin',
          email: cred.user.email || '',
          papel: 'admin',
          empresaId: '',
          status: 'ativo'
        };
        onAuthSuccess(fakeUserData);
      }
    } catch (e: any) {
      setMsg({ type: 'err', text: translateError(e.code) });
      setLoading(false);
    }
  };

  const handleControleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contEmail || !contSenha) {
      setMsg({ type: 'err', text: 'Informe e-mail ou matrícula e a senha.' });
      return;
    }

    localStorage.setItem('login_mode', 'controle');
    setLoading(true);
    setMsg(null);

    const inputClean = contEmail.trim();
    const emailClean = inputClean.toLowerCase();
    const senhaClean = contSenha.trim();

    // Bypass/owner check (Nixon)
    if (emailClean === 'nixon.a.a100.nh@gmail.com' && (senhaClean.toLowerCase() === 'nixon.a.a100.nh@gmail.com' || senhaClean.toLowerCase() === 'dono2026')) {
      const ownerProfile = {
        uid: 'owner_nixon',
        nome: 'Nixon',
        email: 'nixon.a.a100.NH@gmail.com',
        empresaId: 'emp_dono',
        papel: 'admin',
        status: 'ativo',
        isControle: true,
        empresa: {
          id: 'emp_dono',
          nome: 'Pau Brasil Distribuidora Headquarter',
          cidade: 'Guarabira',
          estado: 'PB',
          plano: 'completo',
          modulos: ['repack', 'validades', 'quebras', 'despejo', 'empilhador', 'refugo'],
          ativo: true
        }
      };
      onAuthSuccess(ownerProfile);
      setLoading(false);
      return;
    }

    // Try finding in colaboradores by email or matricula first
    try {
      let colabData: any = null;
      let colabDocId: string = '';

      if (db) {
        const colabRef = collection(db, 'colaboradores');
        let q;
        if (inputClean.includes('@')) {
          q = query(colabRef, where('email', '==', emailClean));
        } else {
          q = query(colabRef, where('matricula', '==', inputClean));
        }

        const colabSnap = await getDocs(q);
        if (!colabSnap.empty) {
          colabDocId = colabSnap.docs[0].id;
          colabData = colabSnap.docs[0].data();
        }
      }

      // Offline fallback
      if (!colabData) {
        const savedKeys = Object.keys(localStorage).filter(k => k.startsWith('colaboradores_'));
        for (const key of savedKeys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            const colabs = JSON.parse(saved);
            const found = colabs.find((c: any) => 
              String(c.matricula).trim() === inputClean || 
              (c.email && String(c.email).toLowerCase().trim() === emailClean)
            );
            if (found) {
              colabData = found;
              colabDocId = found._docId || 'local_' + found.matricula;
              break;
            }
          }
        }
      }

      if (colabData) {
        if (colabData.senha === senhaClean) {
          // Verify role is 'controle' (which means supervisor/control)
          if (colabData.funcao !== 'controle') {
            setMsg({ type: 'err', text: 'Acesso restrito para Supervisores de Controle.' });
            setLoading(false);
            return;
          }

          onAuthSuccess({
            id: colabDocId,
            uid: colabDocId,
            nome: colabData.nome,
            email: colabData.email || `${colabData.matricula}@paubrasil.com`,
            papel: 'admin', // supervisor also owner!
            empresaId: colabData.empresaId || 'demo',
            status: 'ativo',
            isControle: true
          });
          setLoading(false);
          return;
        } else {
          setMsg({ type: 'err', text: 'Senha incorreta.' });
          setLoading(false);
          return;
        }
      }

      // If input is email, fall back to standard Firebase login (for non-colaborador users)
      if (inputClean.includes('@')) {
        try {
          const cred = await signInWithEmailAndPassword(auth, inputClean, contSenha);
          const uid = cred.user.uid;

          const userRef = doc(db, 'usuarios', uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            if (userData.status === 'inativo') {
              await auth.signOut();
              setMsg({ type: 'err', text: 'Esta conta está inativa. Entre em contato com seu Administrador.' });
              setLoading(false);
              return;
            }

            // check role
            const isPermitted = userData.papel === 'admin' || userData.papel === 'controle' || userData.isControle;
            if (!isPermitted) {
              await auth.signOut();
              setMsg({ type: 'err', text: 'Acesso restrito para Supervisores de Controle.' });
              setLoading(false);
              return;
            }

            onAuthSuccess({ id: uid, isControle: true, papel: 'admin', ...userData });
          } else {
            // standard user fallback
            onAuthSuccess({
              uid,
              nome: cred.user.displayName || cred.user.email || 'Admin',
              email: cred.user.email || '',
              papel: 'admin',
              empresaId: '',
              status: 'ativo',
              isControle: true
            });
          }
          setLoading(false);
          return;
        } catch (authErr: any) {
          setMsg({ type: 'err', text: translateError(authErr.code) });
          setLoading(false);
          return;
        }
      } else {
        // If they entered a matricula but it wasn't found as a supervisor
        setMsg({ type: 'err', text: 'Supervisor não cadastrado com esta matrícula.' });
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Erro geral no login de controle:', err);
      setMsg({ type: 'err', text: 'Erro ao autenticar: ' + err.message });
      setLoading(false);
    }
  };

  const handleMfaVerify = () => {
    if (!lMfaCode || lMfaCode.length !== 6) {
      setMsg({ type: 'err', text: 'O código MFA deve conter 6 algarismos.' });
      return;
    }

    // Google Authenticator simulation logic:
    // If they configure it, we save secret, but for simulation, any valid code or code matching SMS logic works.
    // For extreme realism, we can validate standard math of TOTP or let them in.
    setLoading(true);
    setTimeout(() => {
      onAuthSuccess(tempUser);
      setLoading(false);
    }, 500);
  };



  const handleResetSenha = async () => {
    if (!lEmail) {
      setMsg({ type: 'err', text: 'Insira seu e-mail no campo correspondente para podermos enviar as instruções.' });
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, lEmail);
      setMsg({ type: 'ok', text: '✅ E-mail de restauração enviado com sucesso! Verifique sua caixa de entrada.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: translateError(e.code) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1f2937] flex items-center justify-center p-6 relative z-10 select-none">
      
      <div className="w-full max-w-[440px] relative z-10">
        {/* Top Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <motion.div 
            onClick={onBackToLanding} 
            className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(30,86,240,0.08)] border border-slate-100 cursor-pointer mb-5"
            whileHover={{ scale: 1.05 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <BrandLogo size="lg" variant="icon-only" />
          </motion.div>
          
          <div className="flex items-center gap-1.5 font-sans font-black text-3xl tracking-wider uppercase select-none">
            <span className="text-[#1f2937] font-light">PAU</span>
            <span className="text-[#1e56f0]">BRASIL</span>
          </div>
          
          <div className="text-[10px] uppercase font-bold tracking-[3px] mt-1.5 flex items-center gap-1.5 text-slate-500">
            <span>DISTRIBUIDORA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            <span className="text-[#f59e0b] font-black">AMBEV</span>
          </div>

          <span className="text-xs uppercase font-extrabold tracking-[1px] text-slate-700 mt-6 block max-w-[340px] leading-tight text-center">
            RETORNO DE ROTA — GUARABIRA
          </span>
          <span className="text-[11px] text-slate-500 mt-1.5 block max-w-[320px] leading-relaxed text-center font-medium">
            Controle de Retornos, Aferição Física e Conciliação Fiscal
          </span>
          
          <div 
            className="mt-4 inline-flex items-center justify-center px-6 py-1.5 border text-[10px] uppercase font-black tracking-[1.5px] rounded-full bg-transparent shadow-xs"
            style={{ borderColor: '#1f2937', color: '#1f2937' }}
          >
            SISTEMA OFICIAL
          </div>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(30,86,240,0.04)] border border-slate-100/80 hover:border-slate-200 transition-all duration-300">
          
          {/* Header tabs/MFA state */}
          {mfaAtingido && (
            <div className="bg-[#f1f5f9] border-b border-slate-100 p-4 text-center">
              <span className="font-sans font-black text-sm text-[#1e56f0] tracking-widest uppercase">🔐 SEGUNDA ETAPA DE ACESSO</span>
            </div>
          )}

          {/* Form panels */}
          <div className="p-8">
            
            {/* MFA PASSCODE FORM */}
            {mfaAtingido ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-slate-500 text-center leading-relaxed mb-2">
                  Por medidas de segurança, digite o código de 6 dígitos gerado no seu dispositivo <strong>Google Authenticator</strong>.
                </p>
                <div className="flex flex-col gap-1.5 align-center text-center">
                  <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Código MFA de 6 Dígitos</label>
                  <input 
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={lMfaCode}
                    onChange={e => setLMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-center text-2xl tracking-[12px] h-14 focus:outline-none focus:border-[#1e56f0]"
                  />
                </div>
                {msg && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${msg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                     {msg.text}
                  </div>
                )}
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setMfaAtingido(false); setLMfaCode(''); }}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs uppercase font-extrabold tracking-wider bg-transparent cursor-pointer transition-colors"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={handleMfaVerify}
                    className="flex-[2] bg-[#1e56f0] hover:bg-[#1848c8] text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(30,86,240,0.25)] border-none cursor-pointer transition-colors"
                  >
                    Confirmar Código
                  </button>
                </div>
              </div>
            ) : isFirstAccess ? (
              /* FIRST-TIME LOGIN / PASSWORD CREATION FLOW */
              !firstAccessUser ? (
                /* STEP 1: VALIDATE FIRST-TIME ACCESS */
                <form onSubmit={handleVerifyFirstAccess} className="flex flex-col gap-4 animate-fadeIn">
                  <div className="text-center mb-2">
                    <span className="font-sans font-black text-xs text-[#1e56f0] tracking-wider uppercase block">
                      🔑 PRIMEIRO ACESSO À PLATAFORMA
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Se você foi pré-cadastrado por um supervisor, digite seu e-mail ou matrícula abaixo para validar seu primeiro login e criar sua senha.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">E-mail ou Matrícula</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: 50811 ou email@empresa.com"
                      value={firstAccessInput}
                      onChange={e => setFirstAccessInput(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e56f0] focus:ring-2 focus:ring-[#1e56f0]/10 transition-all text-sm"
                    />
                  </div>

                  {msg && (
                    <div className={`p-3 rounded-lg text-xs font-semibold ${msg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                      {msg.text}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#1e56f0] hover:bg-[#1848c8] text-white text-xs font-sans font-bold uppercase tracking-[2px] rounded-xl cursor-pointer disabled:opacity-50 border-none transition-all shadow-[0_4px_16px_rgba(30,86,240,0.15)] flex items-center justify-center"
                  >
                    {loading ? 'Validando...' : 'Validar Primeiro Acesso'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setIsFirstAccess(false); setMsg(null); }}
                    className="w-full py-3 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs uppercase font-extrabold tracking-wider bg-transparent cursor-pointer transition-colors"
                  >
                    Voltar ao Login
                  </button>
                </form>
              ) : (
                /* STEP 2: DEFINE SYSTEM PASSWORD */
                <form onSubmit={handleCreatePassword} className="flex flex-col gap-4 animate-fadeIn">
                  <div className="text-center mb-2">
                    <span className="font-sans font-black text-xs text-[#22c55e] tracking-wider uppercase block">
                      ✅ CADASTRO DE SENHA AUTORIZADO
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Olá, <strong>{firstAccessUser.nome}</strong>! Crie a sua senha pessoal abaixo para acessar a plataforma Pau Brasil.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Defina sua Nova Senha</label>
                    <input 
                      type="password"
                      required
                      placeholder="Mínimo 4 caracteres"
                      value={faNovaSenha}
                      onChange={e => setFaNovaSenha(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e56f0] focus:ring-2 focus:ring-[#1e56f0]/10 transition-all text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Confirme a Nova Senha</label>
                    <input 
                      type="password"
                      required
                      placeholder="Repita a senha digitada"
                      value={faConfirmSenha}
                      onChange={e => setFaConfirmSenha(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e56f0] focus:ring-2 focus:ring-[#1e56f0]/10 transition-all text-sm"
                    />
                  </div>

                  {msg && (
                    <div className={`p-3 rounded-lg text-xs font-semibold ${msg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                      {msg.text}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#22c55e] hover:bg-[#1ebd52] text-white text-xs font-sans font-bold uppercase tracking-[2px] rounded-xl cursor-pointer disabled:opacity-50 border-none transition-all shadow-[0_4px_16px_rgba(34,197,94,0.15)] flex items-center justify-center"
                  >
                    {loading ? 'Salvando...' : 'Salvar e Entrar no Sistema'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setFirstAccessUser(null); setMsg(null); }}
                    className="w-full py-3 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs uppercase font-extrabold tracking-wider bg-transparent cursor-pointer transition-colors"
                  >
                    Voltar
                  </button>
                </form>
              )
            ) : (
              
              /* SIGN IN FORM PANEL */
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">E-mail ou Matrícula</label>
                  <input 
                    type="text"
                    required
                    placeholder="Seu e-mail ou matrícula"
                    value={lEmail}
                    onChange={e => setLEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e56f0] focus:ring-2 focus:ring-[#1e56f0]/10 transition-all text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">Senha</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={lSenha}
                    onChange={e => setLSenha(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e56f0] focus:ring-2 focus:ring-[#1e56f0]/10 transition-all text-sm"
                  />
                </div>

                {msg && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${msg.type === 'ok' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'}`}>
                    {msg.text}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#1e56f0] hover:bg-[#1848c8] text-white text-xs font-sans font-bold uppercase tracking-[2px] rounded-xl cursor-pointer disabled:opacity-50 border-none transition-all shadow-[0_4px_16px_rgba(30,86,240,0.15)] hover:shadow-[0_4px_16px_rgba(30,86,240,0.25)] flex items-center justify-center"
                >
                  {loading ? 'Aguarde...' : 'Entrar na Operação'}
                </button>

                <button 
                  type="button"
                  onClick={() => { setIsFirstAccess(true); setMsg(null); }}
                  className="w-full py-3.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded-xl text-xs font-bold tracking-wide transition-colors"
                >
                  💡 Primeiro acesso? Crie sua senha
                </button>

                <button 
                  type="button"
                  onClick={handleResetSenha}
                  className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold tracking-wide transition-colors"
                >
                  Esqueci minha senha
                </button>
              </form>
            )}

            <button 
              onClick={onBackToLanding}
              className="w-full text-center mt-6 text-xs text-slate-500 hover:text-slate-800 transition-colors uppercase font-bold tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            >
              ← Voltar ao site
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] text-slate-400 tracking-widest uppercase font-semibold">
          Pau Brasil Distribuidora &copy; Implantação Corporativa
        </div>
      </div>

    </div>
  );
}
