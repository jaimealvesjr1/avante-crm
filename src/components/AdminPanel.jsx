import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Key } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';

export default function AdminPanel({ handleCreateUser, newUserEmail, setNewUserEmail, newUserPassword, setNewUserPassword, adminMessage }) {
  const [teamList, setTeamList] = useState([]);

  useEffect(() => {
    // Puxa a lista da equipe em tempo real
    const unsubscribe = onSnapshot(collection(db, "equipe"), (snapshot) => {
      setTeamList(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  // 1. FUNÇÃO: Remover Membro
  const removeUserRecord = async (email) => {
    if(window.confirm(`Remover o acesso visual de ${email} da lista? (O login no Firebase precisará ser apagado no console futuramente)`)){
      await deleteDoc(doc(db, "equipe", email));
      toast.success("Membro removido da lista.");
    }
  };

  // 2. FUNÇÃO: Alterar Cargo (Toggle)
  const toggleRole = async (email, currentRole) => {
    const newRole = currentRole === 'Gerente' ? 'Visualizador' : 'Gerente';
    try {
      await updateDoc(doc(db, "equipe", email), { role: newRole });
      toast.success(`Cargo de ${email} atualizado para ${newRole}.`);
    } catch (error) {
      toast.error("Erro ao alterar o cargo do membro.");
    }
  };

  // 3. FUNÇÃO: Enviar E-mail de Recuperação de Senha
  const sendResetEmail = async (email) => {
    if(window.confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        toast.success(`E-mail de recuperação enviado para ${email}!`);
      } catch (error) {
        toast.error("Erro ao enviar o e-mail. Verifique se o membro existe no Firebase Auth.");
      }
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="text-amber-500" /> Centro de Segurança e Equipe</h2>
          <p className="text-gray-400 text-sm">Gerencie os acessos ao CRM Operacional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA 1: Criar Usuário */}
        <form onSubmit={handleCreateUser} className="bg-gray-900 p-6 rounded-lg border border-gray-700 h-fit shadow-sm">
          <h3 className="text-white font-semibold mb-4">Novo Acesso</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">E-mail</label>
              <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 outline-none focus:border-amber-500 transition-colors" placeholder="exemplo@equipeavante.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Senha Provisória</label>
              <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength="6" className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 outline-none focus:border-amber-500 transition-colors" placeholder="Mínimo 6 caracteres" />
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded transition-colors mt-2">
              Gerar Acesso
            </button>
            {adminMessage && <p className={`text-sm mt-3 text-center font-semibold ${adminMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>{adminMessage}</p>}
          </div>
        </form>

        {/* COLUNA 2/3: Lista da Equipe */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                <th className="p-4 font-semibold">Membro (E-mail)</th>
                <th className="p-4 font-semibold text-center">Nível de Acesso</th>
                <th className="p-4 font-semibold text-center hidden md:table-cell">Data de Criação</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {teamList.map((membro, idx) => (
                <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium">{membro.email}</td>
                  
                  {/* BADGE DE CARGO CLICÁVEL */}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleRole(membro.email, membro.role)} 
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${membro.role === 'Gerente' ? 'bg-amber-900/30 text-amber-400 border-amber-500/30 hover:bg-amber-900/60' : 'bg-blue-900/30 text-blue-400 border-blue-500/30 hover:bg-blue-900/60'}`}
                      title="Clique para alterar entre Operador e Gerente"
                    >
                      {membro.role}
                    </button>
                  </td>
                  
                  <td className="p-4 text-center text-gray-500 hidden md:table-cell">{membro.createdAt}</td>
                  
                  {/* BOTÕES DE AÇÃO */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => sendResetEmail(membro.email)} className="text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1" title="Enviar redefinição de senha">
                        <Key size={16} />
                      </button>
                      <button onClick={() => removeUserRecord(membro.email)} className="text-gray-500 hover:text-red-400 transition-colors" title="Remover da lista">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teamList.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">Nenhum membro registrado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
