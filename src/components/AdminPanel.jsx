import React, { useState } from 'react';
import { UserPlus, Shield, Users, Mail, Clock, Edit2, Check, X, Palette } from 'lucide-react';

// Paleta de cores disponíveis para os Avatares
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
  handleUpdateUser,
  handleToggleRole
}) {
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Lógica para Iniciais
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Cor de fallback automática (caso não tenha escolhido nenhuma)
  const getFallbackColor = (name) => {
    if (!name) return AVATAR_COLORS[6];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % (AVATAR_COLORS.length - 1)];
  };

  const startEditing = (member) => {
    setEditingUser(member.email);
    setEditName(member.nomeCompleto || member.nome || '');
    setEditColor(member.avatarColor || getFallbackColor(member.nomeCompleto || member.nome));
  };

  const saveEdit = (email) => {
    if(editName.trim()) {
      // Passamos agora a cor escolhida como 3º parâmetro
      handleUpdateUser(email, editName, editColor);
    }
    setEditingUser(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 shadow-inner">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Painel da Equipe</h2>
          <p className="text-sm text-gray-400 mt-0.5">Gestão de acessos e personalização de perfis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO (Ocupa 2/5) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleCreateUser} className="bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner h-full flex flex-col">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-6 flex items-center gap-2">
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

        {/* LADO DIREITO: LISTA DE USUÁRIOS (Ocupa 3/5) */}
        <div className="lg:col-span-3">
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner h-full flex flex-col min-h-[450px]">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Users size={16} className="text-gray-400"/> Membros da Equipe ({teamMembers?.length || 0})
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {teamMembers?.map((member, idx) => {
                const displayRole = member.role === 'Visualizador' ? 'Operacional' : (member.role || 'Operacional');
                const isEditing = editingUser === member.email;
                const userColor = member.avatarColor || getFallbackColor(member.nomeCompleto || member.nome);
                
                return (
                  <div key={idx} className="bg-white/[0.03] hover:bg-white/[0.05] p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                    
                    <div className="flex items-start sm:items-center gap-4">
                      {/* AVATAR COM COR DINÂMICA */}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${isEditing ? editColor : userColor} flex items-center justify-center font-bold text-white shadow-sm border border-white/20 shrink-0 text-lg transition-all`}>
                        {getInitials(isEditing ? editName : (member.nomeCompleto || member.nome))}
                      </div>
                      
                      <div>
                        {isEditing ? (
                          <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)} 
                              className="bg-black/40 border border-indigo-500/50 text-white text-sm font-bold rounded-lg px-3 py-1.5 outline-none w-full max-w-[200px]"
                              placeholder="Nome completo"
                              autoFocus
                            />
                            {/* PALETA DE CORES */}
                            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/10 w-max">
                              <Palette size={12} className="text-gray-500 mx-1" />
                              {AVATAR_COLORS.map(colorClass => (
                                <button
                                  key={colorClass}
                                  onClick={() => setEditColor(colorClass)}
                                  className={`w-5 h-5 rounded-full bg-gradient-to-br ${colorClass} transition-transform ${editColor === colorClass ? 'scale-125 border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border border-white/20 hover:scale-110'}`}
                                  title="Escolher cor"
                                />
                              ))}
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => saveEdit(member.email)} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Check size={14}/> Salvar</button>
                              <button onClick={() => setEditingUser(null)} className="bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><X size={14}/> Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group mb-0.5">
                            <p className="text-sm font-bold text-white leading-none">{member.nomeCompleto || member.nome || 'Sem Nome'}</p>
                            <button onClick={() => startEditing(member)} className="text-gray-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded-md" title="Editar Usuário">
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                        
                        {!isEditing && (
                          <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                            <Mail size={12} /> {member.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 mt-2 sm:mt-0">
                      
                      <button 
                        onClick={() => handleToggleRole(member.email, displayRole)}
                        title="Clique para alternar o nível de acesso"
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider cursor-pointer hover:scale-105 transition-all shadow-sm ${
                          displayRole === 'Admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          displayRole === 'Supervisor' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                          'bg-white/5 text-gray-300 border border-white/10'
                        }`}
                      >
                        {displayRole}
                      </button>

                      <span className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-2">
                        <Clock size={12}/> {member.createdAt || 'Membro Antigo'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!teamMembers || teamMembers.length === 0) && (
                <div className="flex flex-col items-center justify-center p-12 bg-white/[0.01] border border-white/5 rounded-2xl border-dashed">
                  <Users size={48} className="text-gray-600 mb-4" />
                  <p className="text-gray-400 text-sm font-medium">Nenhum usuário encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
