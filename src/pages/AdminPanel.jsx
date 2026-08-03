import React, { useState } from 'react';
import { UserPlus, Shield, Users, Mail, Clock, Edit2, Check, X, Palette, Eye, Flame, Trash2, DollarSign, Calendar, Percent, Target, Briefcase, User } from 'lucide-react';
import { getVisualRole } from '../App';
import { toast } from 'react-hot-toast';

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-500',
  'from-gray-500 to-slate-600'
];

export default function AdminPanel({
  handleCreateUser, 
  newUserEmail, setNewUserEmail, 
  newUserPassword, setNewUserPassword,
  newUserName, setNewUserName,
  teamMembers,
  handleDeleteUser,
  handleUpdateUser,
  handleToggleRole,
  closeMonth,
  startSimulation, 
  isSimulating
}) {
  const [editingUser, setEditingUser] = useState(null);
  
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const [editSalarioFixo, setEditSalarioFixo] = useState(0);
  const [editDiaFixo, setEditDiaFixo] = useState('');
  const [editPercentual, setEditPercentual] = useState(0);
  const [editBaseCalculo, setEditBaseCalculo] = useState('LT'); // LT (Bruto) ou LL (Líquido)
  const [editGatilho, setEditGatilho] = useState(0); // Valor a exceder (Ex: 16000 do Jaime)
  const [editDiaVariavel, setEditDiaVariavel] = useState('');
  const [editFrequencia, setEditFrequencia] = useState('mensal');
  
  const [editTipoConta, setEditTipoConta] = useState('PF');

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getFallbackColor = (name) => {
    if (!name) return AVATAR_COLORS[6];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  // Carrega os dados atuais do usuário para os inputs
  const startEditing = (member) => {
    setEditingUser(member.email);
    setEditName(member.nomeCompleto || member.nome || '');
    setEditColor(member.avatarColor || getFallbackColor(member.nomeCompleto || member.nome));
    setEditAvatarUrl(member.avatarUrl || '');

    // Carrega a configuração financeira (se existir)
    const pConfig = member.paymentConfig || {};
    setEditSalarioFixo(pConfig.salarioFixo || 0);
    setEditDiaFixo(pConfig.diaFixo || '');
    setEditPercentual(pConfig.percentual || 0);
    setEditBaseCalculo(pConfig.baseCalculo || 'LT');
    setEditGatilho(pConfig.gatilho || 0);
    setEditDiaVariavel(pConfig.diaVariavel || '');
    setEditFrequencia(pConfig.frequencia || 'mensal');
    setEditTipoConta(pConfig.tipoConta || 'PF');
  };

  const saveEdit = (email) => {
    if (!editName.trim()) {
      return toast.error("O nome do usuário não pode ficar em branco.");
    }

    const paymentConfig = {
      salarioFixo: Number(editSalarioFixo),
      diaFixo: editDiaFixo,
      percentual: Number(editPercentual),
      baseCalculo: editBaseCalculo,
      gatilho: Number(editGatilho),
      diaVariavel: editDiaVariavel,
      frequencia: editFrequencia,
      tipoConta: editTipoConta
    };

    handleUpdateUser(email, editName, editColor, editAvatarUrl, paymentConfig);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end mb-4">
          <button 
            onClick={closeMonth} 
            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Flame size={16} /> Fechar Mês
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        <div className="lg:col-span-2">
          <form onSubmit={handleCreateUser} className="bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner h-full flex flex-col">
            <h3 className="text-lg font-bold text-indigo-400 uppercase tracking-wide mb-6 flex items-center gap-2">
              <UserPlus size={16} /> Novo Usuário
            </h3>

            <div className="mb-5 space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Nome Completo</label>
                <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ex: João da Silva" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors shadow-inner" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">E-mail de Acesso</label>
                <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@agencia.com" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors shadow-inner" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Senha Provisória</label>
                <input type="password" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength="6" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors shadow-inner" />
              </div>
            </div>

            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 w-full mt-auto">
              <UserPlus size={16} /> Criar Acesso
            </button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner h-full flex flex-col min-h-[450px]">
            <h3 className="text-lg font-bold text-gray-300 uppercase tracking-wide mb-6 flex items-center gap-2">
              <Users size={16} className="text-gray-400"/> Membros da Equipe ({teamMembers?.length || 0})
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {teamMembers?.map((member, idx) => {
                const displayRole = member.role === 'Visualizador' ? 'Operacional' : (member.role || 'Operacional');
                const isEditing = editingUser === member.email;
                const userColor = member.avatarColor || getFallbackColor(member.nomeCompleto || member.nome);
                
                return (
                  <div key={idx} className={`bg-white/[0.03] hover:bg-white/[0.05] p-4 rounded-2xl border border-white/5 flex flex-col transition-colors ${isEditing ? 'ring-1 ring-indigo-500/50' : ''}`}>
                    
                    <div className="flex items-start sm:items-center gap-4 w-full">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${isEditing ? editColor : userColor} flex items-center justify-center font-bold text-white shadow-sm border border-white/20 shrink-0 text-lg transition-all overflow-hidden`}>
                        {member.avatarUrl && !isEditing ? (
                          <img src={member.avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(isEditing ? editName : (member.nomeCompleto || member.nome))
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {!isEditing ? (
                          <>
                            <div className="flex items-center gap-2 group mb-0.5">
                              <p className="text-sm font-bold text-white leading-none">{member.nomeCompleto || member.nome || 'Sem Nome'}</p>

                              <button onClick={() => startSimulation(member)} disabled={isSimulating} className="text-gray-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded-md" title="Ver o sistema como este usuário">
                                <Eye size={12} />
                              </button>

                              <button onClick={() => startEditing(member)} className="text-gray-500 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded-md" title="Editar Usuário e Financeiro">
                                <Edit2 size={12} />
                              </button>

                              <button onClick={() => handleDeleteUser(member.email)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded-md" title="Excluir Usuário permanentemente">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                              <Mail size={12} /> {member.email}
                            </p>
                            
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {member.paymentConfig && member.paymentConfig.tipoConta && (
                                <span className={`text-[10px] border px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  member.paymentConfig.tipoConta === 'MEI' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                  {member.paymentConfig.tipoConta === 'MEI' ? <Briefcase size={10}/> : <User size={10}/>}
                                  {member.paymentConfig.tipoConta === 'MEI' ? 'Gestão MEI' : 'Gestão PF (Pessoal)'}
                                </span>
                              )}

                              {member.paymentConfig && member.paymentConfig.salarioFixo >= 0 && (
                                <>
                                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <DollarSign size={10}/> R$ {member.paymentConfig.salarioFixo}
                                  </span>
                                  {member.paymentConfig.percentual > 0 && (
                                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Percent size={10}/> {member.paymentConfig.percentual}% do {member.paymentConfig.baseCalculo}
                                      </span>
                                  )}
                                </>
                              )}
                          </div>
                          </>
                        ) : (
                          <div className="animate-in fade-in zoom-in-95 w-full">
                            <div className="flex flex-col gap-2 mb-4">
                              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="bg-black/40 border border-indigo-500/50 text-white text-sm font-bold rounded-lg px-3 py-1.5 outline-none w-full" placeholder="Nome completo" autoFocus />
                              <input type="text" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} className="bg-black/40 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 outline-none w-full focus:border-indigo-500" placeholder="Link da foto (ImgBB, etc)" />
                              
                              <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/10 w-max">
                                <Palette size={12} className="text-gray-500 mx-1" />
                                {AVATAR_COLORS.map(colorClass => (
                                  <button key={colorClass} onClick={() => setEditColor(colorClass)} className={`w-5 h-5 rounded-full bg-gradient-to-br ${colorClass} transition-transform ${editColor === colorClass ? 'scale-125 border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border border-white/20 hover:scale-110'}`} />
                                ))}
                              </div>
                            </div>

                            <div className="bg-black/30 p-4 rounded-xl border border-white/10 mt-2">
                              <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-1 uppercase tracking-wider"><DollarSign size={14}/> Configuração de Remuneração</h4>

                              <div className="col-span-2 sm:col-span-4 mb-4 p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div>
                                      <label className="block text-[11px] font-bold text-white mb-0.5">Tipo de Gestão</label>
                                      <p className="text-[9px] text-gray-400 leading-tight max-w-[200px]">Define se o painel individual deste membro será Pessoal (PF) ou Empresarial (MEI)</p>
                                  </div>
                                  <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 w-full sm:w-auto">
                                      <button 
                                          type="button"
                                          onClick={() => setEditTipoConta('PF')}
                                          className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${editTipoConta === 'PF' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                                      >
                                          <User size={12}/> Pessoal (PF)
                                      </button>
                                      <button 
                                          type="button"
                                          onClick={() => setEditTipoConta('MEI')}
                                          className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${editTipoConta === 'MEI' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                                      >
                                          <Briefcase size={12}/> MEI (PJ)
                                      </button>
                                  </div>
                              </div>
                                                            
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                <div className="col-span-2">
                                  <label className="block text-[10px] text-gray-400 mb-1">Frequência de Pagto</label>
                                  <select value={editFrequencia} onChange={e => setEditFrequencia(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
                                    <option value="mensal">Mensal Único</option>
                                    <option value="fracionado">Mensal Fracionado (Fixo e Var separados)</option>
                                    <option value="quinzenal">Quinzenal</option>
                                    <option value="semanal">Semanal</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">Fixo (R$)</label>
                                  <input type="number" value={editSalarioFixo} onChange={e => setEditSalarioFixo(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none" placeholder="0.00"/>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">Dia Pagto Fixo</label>
                                  <input type="text" value={editDiaFixo} onChange={e => setEditDiaFixo(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none" placeholder="Ex: 5 ou Sexta"/>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">Comissão (%)</label>
                                  <input type="number" value={editPercentual} onChange={e => setEditPercentual(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none" placeholder="0"/>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">Base do Cálculo</label>
                                  <select value={editBaseCalculo} onChange={e => setEditBaseCalculo(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
                                    <option value="LT">Fat. Bruto (LT)</option>
                                    <option value="LL">Lucro Líq. (LL)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1" title="Só paga % do que passar deste valor">Gatilho / Acima de</label>
                                  <input type="number" value={editGatilho} onChange={e => setEditGatilho(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none" placeholder="Ex: 16000"/>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">Dia Pagto Var</label>
                                  <input type="text" value={editDiaVariavel} onChange={e => setEditDiaVariavel(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none" placeholder="Ex: 20"/>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4 justify-end">
                              <button onClick={() => setEditingUser(null)} className="bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><X size={14}/> Cancelar</button>
                              <button onClick={() => saveEdit(member.email)} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md flex items-center gap-1"><Check size={14}/> Salvar Regras</button>
                            </div>
                          </div>
                        )}
                      </div>

                    {!isEditing && (
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 mt-2 sm:mt-0 shrink-0">
                        
                        <button 
                          onClick={() => handleToggleRole(member.email, member.role)}
                          title="Clique para alternar o nível de acesso"
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider cursor-pointer hover:scale-105 transition-all shadow-sm ${
                            member.role === 'Admin' || member.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            member.role === 'Supervisor' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                            member.role === 'Visitante' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            'bg-white/5 text-gray-300 border border-white/10'
                          }`}
                        >
                          {getVisualRole(member.role)}
                        </button>

                        <span className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-2">
                          <Clock size={12}/> {member.createdAt || 'Membro Antigo'}
                        </span>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
