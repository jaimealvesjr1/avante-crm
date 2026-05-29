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
