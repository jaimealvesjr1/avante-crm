import React from 'react';
import { Activity } from 'lucide-react';

export default function AuthScreen({ 
  email, setEmail, password, setPassword, handleLogin, authError, authLoading 
}) {
  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-bold">Carregando CRM Avante...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-200">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <img src="/logo.png" alt="Logo Avante" className="h-8 w-auto object-contain" /> 
                CRM Avante
            </h1>
          <p className="text-gray-400 text-sm mt-2">Área restrita da equipa</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>
          
          {authError && <p className="text-red-400 text-sm font-bold text-center">{authError}</p>}
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4">
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
