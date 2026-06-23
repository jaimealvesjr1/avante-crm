export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

// Formata números gerais com padrão brasileiro
export const formatNumber = (value) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

// Motor de cálculo inteligente da folha de pagamento da equipe
export const calcularFolhaMembro = (membro, faturamentoBruto, custoOperacional, bonusManual = 0) => {
  if (!membro.paymentConfig) return null;
  
  const config = membro.paymentConfig;
  const bruto = Number(faturamentoBruto) || 0;
  const custo = Number(custoOperacional) || 0;
  const lucroLiquido = Math.max(0, bruto - custo);

  const baseDoCalculo = config.baseCalculo === 'LL' ? lucroLiquido : bruto;
  const valorElegivel = Math.max(0, baseDoCalculo - (Number(config.gatilho) || 0));
  const comissao = valorElegivel * ((Number(config.percentual) || 0) / 100);
  const fixo = Number(config.salarioFixo) || 0;
  const total = fixo + comissao + Number(bonusManual);

  return { fixo, comissao, bonus: Number(bonusManual), total };
};
