import { create } from 'zustand';

export const useAppStore = create((set) => ({
  
  activeView: 'feed_equipe', // Tela inicial padrão
  
  isSimulating: false, // Controle de simulação de usuário
  
  // Termo de busca direto do cache do navegador
  searchTerm: localStorage.getItem('avante_sync_search') || '',
  
  // Controle do olhinho (mostrar/ocultar valores financeiros)
  showValues: localStorage.getItem('avante_show_values') !== 'false',

  // NOVO: Controle da barra lateral do "Meu Diário / Roteiro"
  isDiaryOpen: false,

  // NOVO: Controle de Início/Fim do expediente (salvo no cache)
  isDayStarted: localStorage.getItem('avante_day_started') === 'true',

  setActiveView: (view) => set({ activeView: view }),
  
  setIsSimulating: (status) => set({ isSimulating: status }),
  
  setSearchTerm: (term) => {
    localStorage.setItem('avante_sync_search', term);
    set({ searchTerm: term });
  },
  
  toggleShowValues: () => set((state) => {
    const newValue = !state.showValues;
    localStorage.setItem('avante_show_values', String(newValue));
    return { showValues: newValue };
  }),

  // NOVO: Abre ou fecha a barra lateral do diário
  setIsDiaryOpen: (status) => set({ isDiaryOpen: status }),

  // NOVO: Inicia ou encerra o dia de trabalho
  toggleDayStarted: () => set((state) => {
    const newValue = !state.isDayStarted;
    localStorage.setItem('avante_day_started', String(newValue));
    return { isDayStarted: newValue };
  }),

}));
