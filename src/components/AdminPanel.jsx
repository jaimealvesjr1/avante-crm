import React, { useState, useEffect } from 'react';
import { Users, Shield, Trash2 } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function AdminPanel({ handleCreateUser, newUserEmail, setNewUserEmail, newUserPassword, setNewUserPassword, adminMessage }) {
  const [teamList, setTeamList] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "equipe"), (snapshot) => {
      setTeamList(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  const removeUserRecord = async (email) => {
    if(window.confirm(`Remover o acesso visual de ${email} da lista? (O login no Firebase precisará de ser apagado no console futuramente)`)){
      await deleteDoc(doc(db, "equipe", email));
      toast.success("Membro removido da lista.");
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
        {/* COLUNA 1: Criar Utilizador */}
        <form onSubmit={handleCreateUser} className="bg-gray-900 p-6 rounded-lg border border-gray-700 h-fit">
          <h3 className="text-white font-semibold mb-4">Novo Acesso</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">E-mail</label>
              <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 outline-none focus:border-amber-500" placeholder="exemplo@equipeavante.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Senha Provisória</label>
              <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength="6" className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 outline-none focus:border-amber-500" placeholder="Mínimo 6 caracteres" />
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded transition-colors mt-2">
              Gerar Acesso
            </button>
            {adminMessage && <p className={`text-sm mt-3 text-center font-semibold ${adminMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>{adminMessage}</p>}
          </div>
        </form>

        {/* COLUNA 2/3: Lista da Equipe */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-950 text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="p-4 font-semibold">Membro (E-mail)</th>
                <th className="p-4 font-semibold text-center">Papel</th>
                <th className="p-4 font-semibold text-center">Data de Criação</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {teamList.map((membro, idx) => (
                <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium">{membro.email}</td>
                  <td className="p-4 text-center"><span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">{membro.role}</span></td>
                  <td className="p-4 text-center text-gray-500">{membro.createdAt}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => removeUserRecord(membro.email)} className="text-gray-500 hover:text-red-400 p-1 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {teamList.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-500">Nenhum membro registado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
