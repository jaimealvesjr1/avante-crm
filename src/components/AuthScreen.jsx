import React, { useState } from 'react';
import { TrendingUp, Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function AuthScreen({ handleLogin, email, setEmail, password, setPassword, authError }) {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await handleLogin(e);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Orbes de Luz de Fundo (Efeito de Profundidade) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* CARD PRINCIPAL COM GLASSMORPHISM */}
      <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.jpg" 
            alt="Avante HUB" 
            className="h-20 w-auto object-contain mb-4 rounded-2xl shadow-lg border border-white/10" 
          />
          <h2 className="text-2xl font-bold text-white tracking-tight">AVANTE<span className="text-indigo-500">HUB</span></h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold text-center">Central de Inteligência Estratégica</p>
        </div>

        {/* MENSAGEM DE ERRO (CASO EXISTA) */}
        {authError && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold shadow-inner">
            <AlertCircle size={16} />
            <p>{authError}</p>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="seu.nome@agencia.com" 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium shadow-inner" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Sua Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium shadow-inner" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 text-sm"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <LogIn size={18} /> Entrar na Plataforma
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
