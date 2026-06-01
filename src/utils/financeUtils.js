/**
 * Calcula a comissão da agência com base no faturamento do cliente e sua regra específica.
 * 
 * @param {Object} faturamento - Dados do lançamento (receita bruta, custos, etc.)
 * @param {Object} regraComissao - Regra cadastrada no perfil do cliente
 * @returns {Number} - Valor final da comissão gerada
 */
export const calcularComissao = (faturamento, regraComissao) => {
  const { receitaBruta, custos } = faturamento;
  const receitaLiquida = receitaBruta - custos;

  let valorComissao = 0;

  // Verifica qual é o tipo de contrato/comissão do cliente
  switch (regraComissao.tipo) {
    case 'PERCENTUAL_FATURAMENTO':
      // Ex: 10% sobre todo o dinheiro que entrou
      valorComissao = receitaBruta * (regraComissao.percentual / 100);
      break;

    case 'PERCENTUAL_LUCRO':
      // Ex: 20% apenas sobre o que sobrou após os custos da campanha
      valorComissao = receitaLiquida * (regraComissao.percentual / 100);
      break;

    case 'FIXO_MAIS_VARIAVEL':
      // Ex: Fee mensal de R$ 1000 + 5% do lucro
      const variavel = receitaLiquida * (regraComissao.percentual / 100);
      valorComissao = regraComissao.valorFixo + variavel;
      break;

    default:
      valorComissao = 0;
  }

  return valorComissao;
};
