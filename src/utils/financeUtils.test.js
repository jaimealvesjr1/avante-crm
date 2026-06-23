import { describe, it, expect } from 'vitest';
import { formatNumber, calcularFolhaMembro } from './financeUtils';

// 'describe' agrupa nossos testes por categoria
describe('Testes do arquivo financeUtils.js', () => {

  // 'describe' para a função de formatar número
  describe('formatNumber', () => {
    it('deve formatar o número para o padrão brasileiro corretamente', () => {
      // 'expect' é o que esperamos que aconteça.
      // Substituímos os espaços normais pelo espaço sem quebra (String.fromCharCode(160))
      // que é o padrão gerado pelo Intl.NumberFormat no JavaScript
      const formatado = formatNumber(1500.5);
      const esperado = `1.500,50`; 
      
      expect(formatado).toBe(esperado);
    });

    it('deve retornar 0 formatado quando não receber valor', () => {
      expect(formatNumber(null)).toBe('0,00');
      expect(formatNumber(undefined)).toBe('0,00');
    });
  });

  // 'describe' para a nossa regra de negócio mais crítica: Folha de Pagamento
  describe('calcularFolhaMembro', () => {
    it('deve calcular corretamente a comissão baseada no Lucro Líquido (LL)', () => {
      const membroFake = {
        paymentConfig: {
          baseCalculo: 'LL',
          gatilho: 1000, // Só ganha comissão acima de 1000 de lucro
          percentual: 10, // 10% de comissão
          salarioFixo: 2000
        }
      };

      // Faturamento Bruto: 5000 | Custo: 2000 => Lucro Liquido: 3000
      // Valor Elegível (Lucro Liquido 3000 - Gatilho 1000) = 2000
      // Comissão (10% de 2000) = 200
      // Total (Fixo 2000 + Comissão 200) = 2200
      const resultado = calcularFolhaMembro(membroFake, 5000, 2000, 0);

      expect(resultado.fixo).toBe(2000);
      expect(resultado.comissao).toBe(200);
      expect(resultado.bonus).toBe(0);
      expect(resultado.total).toBe(2200);
    });

    it('deve retornar null se o membro não tiver configuração de pagamento (paymentConfig)', () => {
      const membroSemConfig = { nome: 'João' };
      const resultado = calcularFolhaMembro(membroSemConfig, 5000, 2000);
      
      // Esperamos que a função proteja o sistema e retorne null
      expect(resultado).toBeNull(); 
    });
  });

});
