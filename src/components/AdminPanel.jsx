import React, { useState } from 'react';
import { UserPlus, Shield, Users, Mail, Clock, Edit2, Check, X } from 'lucide-react';

export default function AdminPanel({
  handleCreateUser, 
  newUserEmail, setNewUserEmail, 
  newUserPassword, setNewUserPassword,
  newUserName, setNewUserName,
  teamMembers,
  handleUpdateUser,
  handleToggleRole // <-- NOVA FUNÇÃO RECEBIDA AQUI
}) {
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');

  const startEditing = (member) => {
    setEditingUser(member.email);
    setEditName(member.nomeCompleto || member.nome || '');
  };

  const saveEdit = (email) => {
    if(editName.trim()) {
      handleUpdateUser(email, editName);
    }
    setEditingUser(null);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 animate-in fade-in duration-300 shadow-lg">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
        <div className="p-2 bg-indigo-900/50 rounded-lg text-indigo-400">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Painel da Equipe</h2>
          <p className="text-sm text-gray-400">Crie novos acessos e gerencie os usuários do sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO */}
        <div>
          <form onSubmit={handleCreateUser} className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-inner h-full">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <UserPlus size={16} className="text-indigo-400"/> Adicionar Novo Usuário
            </h3>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nome Completo</label>
              <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ex: João da Silva" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">E-mail de Acesso</label>
                <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@agencia.com" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Senha Provisória</label>
                <input type="password" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength="6" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
            </div>

            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:scale-105 w-full flex items-center justify-center gap-2">
              <UserPlus size={18} /> Criar Acesso
            </button>
          </form>
        </div>

        {/* LADO DIREITO: LISTA DE USUÁRIOS */}
        <div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-inner h-full flex flex-col">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Users size={16} className="text-indigo-400"/> Usuários Cadastrados ({teamMembers?.length || 0})
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[300px]">
              {teamMembers?.map((member, idx) => {
                const displayRole = member.role === 'Visualizador' ? 'Operacional' : (member.role || 'Operacional');
                
                return (
                  <div key={idx} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                        {(member.nome?.charAt(0) || member.email?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      <div>
                        
                        {editingUser === member.email ? (
                          <div className="flex items-center gap-2 mb-0.5">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)} 
                              className="bg-gray-900 border border-indigo-500 text-white text-sm font-bold rounded px-2 py-1 outline-none w-40"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(member.email)} className="text-green-400 hover:text-green-300 transition-colors"><Check size={16}/></button>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-red-400 transition-colors"><X size={16}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group mb-0.5">
                            <p className="text-sm font-bold text-white leading-none">{member.nomeCompleto || member.nome || 'Sem Nome'}</p>
                            <button onClick={() => startEditing(member)} className="text-gray-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} /> {member.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto">
                      
                      {/* NOVA TAG CLICÁVEL DE PROMOÇÃO */}
                      <button 
                        onClick={() => handleToggleRole(member.email, displayRole)}
                        title="Clique para alternar o nível de acesso"
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${displayRole === 'Gerente' ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50' : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}`}
                      >
                        {displayRole}
                      </button>

                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                        <Clock size={10}/> {member.createdAt || 'Antigo'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!teamMembers || teamMembers.length === 0) && (
                <div className="text-center p-6 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
