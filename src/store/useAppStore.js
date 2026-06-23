import { create } from 'zustand';

export const useAppStore = create((set) => ({
  
  activeView: 'feed_equipe', // Tela inicial padrão
  
  isSimulating: false, // Controle de simulação de usuário
  
  // Já puxamos o termo de busca direto do cache do navegador (localStorage)
  searchTerm: localStorage.getItem('avante_sync_search') || '',
  
  // Controle do olhinho (mostrar/ocultar valores financeiros)
  showValues: localStorage.getItem('avante_show_values') !== 'false',

  // Muda a tela atual
  setActiveView: (view) => set({ activeView: view }),
  
  // Ativa ou desativa o modo simulação
  setIsSimulating: (status) => set({ isSimulating: status }),
  
  // Atualiza o termo de busca E já salva no navegador automaticamente
  setSearchTerm: (term) => {
    localStorage.setItem('avante_sync_search', term);
    set({ searchTerm: term });
  },
  
  // Inverte o valor do olhinho (de true para false e vice-versa) e salva no cache
  toggleShowValues: () => set((state) => {
    const newValue = !state.showValues;
    localStorage.setItem('avante_show_values', String(newValue));
    return { showValues: newValue };
  }),

}));
