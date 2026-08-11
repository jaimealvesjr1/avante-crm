/**
 * Motor de Cálculo Unificado - Avante HUB
 * Centraliza as regras de negócio para metas, projeções e classificação de status das lojas.
 */

export const enrichStoreMetrics = (store, currentDay, daysInMonth, globalGrowth, clientGrowthMap = {}, marketplaceGrowthMap = {}) => {
  const customG = store.customGrowth;
  const clientG = clientGrowthMap[store.client];
  const mktG = store.marketplace ? marketplaceGrowthMap[store.marketplace.toUpperCase()] : undefined;
  
  let growthRate = Number(globalGrowth) || 0;
  let appliedGrowthType = 'Global';
  let gmvTarget = 0;

  // 1. Definição da Meta (Seja Fixa Estática ou Percentual Composta)
  if (store.targetType === 'fixed') {
    gmvTarget = Number(store.fixedGmvTarget) || 0;
    appliedGrowthType = 'Meta Fixa';
    growthRate = 0;
  } else {
    // Soma cumulativa das taxas de crescimento baseada nas regras de canais, clientes e lojas
    if (mktG !== undefined && mktG !== null && mktG !== '') {
      growthRate += Number(mktG); 
      appliedGrowthType += ' + Canal';
    }
    if (clientG !== undefined && clientG !== null && clientG !== '') {
      growthRate += Number(clientG); 
      appliedGrowthType += ' + Cliente';
    }
    if (customG !== undefined && customG !== null && customG !== '') {
      growthRate += Number(customG); 
      appliedGrowthType += ' + Loja';
    }
    gmvTarget = (Number(store.gmvBase) || 0) * (1 + (growthRate / 100));
  }

  // 2. Cálculo Estatístico de Projeção Linear para o Fim do Mês
  const currentRevenue = Number(store.currentRevenue) || 0;
  
  let safeCurrentDay = Number(currentDay) > 0 ? Number(currentDay) : 1;
  
  // Auto-correção: Se o histórico desta loja vai além do dia configurado globalmente, usamos o dia do histórico
  if (store.history && store.history.length > 0) {
    const maxHistoryDay = Math.max(...store.history.map(h => Number(h.day) || 1));
    if (maxHistoryDay > safeCurrentDay) {
      safeCurrentDay = maxHistoryDay;
    }
  }

  const safeDaysInMonth = Number(daysInMonth) > 0 ? Number(daysInMonth) : 30;
  
  const projectedGmv = (currentRevenue / safeCurrentDay) * safeDaysInMonth;
  
  // 3. Porcentagem de Atingimento da Meta Proposta
  const percentReached = gmvTarget > 0 ? (projectedGmv / gmvTarget) * 100 : 0;

  // 4. Classificação Padronizada de Saúde Visual (SLA / Pacing)
  let status = 'danger';
  if (percentReached >= 95) status = 'success';
  else if (percentReached >= 80) status = 'warning';

  // Devolve o objeto da loja estendido com os novos campos calculados
  return {
    ...store,
    gmvTarget,
    projectedGmv,
    percentReached,
    growthRate,
    appliedGrowthType,
    status
  };
};
