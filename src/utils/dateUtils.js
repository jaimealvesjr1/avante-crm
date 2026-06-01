/**
 * src/utils/dateUtils.js
 * * Esta função calcula as datas exatas de início e fim de um mês.
 * @param {number} offset - 0 (Mês atual), -1 (Mês anterior), 1 (Próximo mês).
 * @returns {object} { startOfMonth, endOfMonth }
 */
export const getMonthBoundaries = (offset = 0) => {
  const today = new Date();
  
  // Encontra o mês e ano alvo baseado no offset
  const targetMonth = today.getMonth() + offset;
  const targetYear = today.getFullYear();

  // Define para o dia 1 do mês alvo à meia-noite (00:00:00)
  const startOfMonth = new Date(targetYear, targetMonth, 1);
  
  // Define para o último dia do mês alvo às 23:59:59
  // Usar o dia "0" do próximo mês resulta no último dia do mês atual.
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
};

export const getSemanaDoMes = (dateString) => {
  const data = new Date(dateString);
  const primeiroDiaDoMes = new Date(data.getFullYear(), data.getMonth(), 1);
  const diaDaSemanaPrimeiroDia = primeiroDiaDoMes.getDay(); // 0 a 6
  const offsetData = data.getDate() + diaDaSemanaPrimeiroDia - 1;
  const semana = Math.floor(offsetData / 7) + 1;
  return `Semana ${semana}`;
};

// Transforma data do banco em MM/YY
export const getMesAno = (dateString) => {
  const data = new Date(dateString);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${mesesNomes[data.getMonth()]}/${String(data.getFullYear()).slice(-2)}`;
};

// Padroniza e limpa digitações de datas do usuário
export const normalizeMonthYear = (str) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}$/.test(str)) { 
      const [y, m] = str.split('-');
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return `${months[parseInt(m, 10) - 1]}/${y.slice(-2)}`;
  }
  let cleanStr = String(str).toUpperCase().replace(/\s+/g, '');
  cleanStr = cleanStr.replace('ABRI', 'ABR');
  const match = cleanStr.match(/^([A-Z]{3,4})\/?(\d{2,4})$/);
  if (match) {
      let m = match[1].substring(0, 3);
      let y = match[2];
      if (y.length === 4) y = y.slice(-2);
      return `${m}/${y}`;
  }
  return str.toUpperCase();
};
