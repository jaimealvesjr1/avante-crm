import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Carrega o logotipo da B2X de forma assíncrona para o jsPDF
 */
const loadLogo = () => new Promise((resolve) => {
  const img = new Image();
  img.src = '/logo b2x.jpg'; 
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
});

/**
 * Configura o cabeçalho padrão escuro premium para os relatórios da Avante/B2X
 */
const renderHeader = (docPdf, title, subtitle, dateLabel, logoImg, dataGeracao) => {
  // Fundo Azul Escuro Moderno
  docPdf.setFillColor(15, 23, 42); 
  docPdf.rect(0, 0, 210, 46, 'F'); 
  
  // Título Principal (Nome do Cliente ou do Evento)
  docPdf.setFontSize(22); 
  docPdf.setTextColor(255, 255, 255); 
  docPdf.text(title.toUpperCase(), 14, 22);
  
  // Subtítulo da Operação
  docPdf.setFontSize(9); 
  docPdf.setTextColor(148, 163, 184); 
  docPdf.text(subtitle, 14, 29); 
  
  // Data ou Parcial Destacada em Amarelo
  docPdf.setFontSize(9); 
  docPdf.setTextColor(250, 204, 21);
  docPdf.text(dateLabel, 14, 35);

  // Renderização da Logo ou Fallback de texto
  if (logoImg) {
    docPdf.addImage(logoImg, 'JPEG', 178, 12, 18, 18);
  } else {
    docPdf.setFontSize(14); 
    docPdf.setTextColor(255, 255, 255); 
    docPdf.text('B2X', 196, 22, { align: 'right' });
  }

  // Carimbo de data de geração no canto inferior do cabeçalho
  docPdf.setFontSize(8); 
  docPdf.setTextColor(107, 114, 128); 
  docPdf.text(`Gerado em: ${dataGeracao}`, 196, 40, { align: 'right' });
};

/**
 * FUNÇÃO 1: Gera o Relatório Mensal Consolidado por Cliente
 */
export const generateMonthlyReportPDF = async (clientName, clientStores, periodoApurado, dataGeracao, formatCurrency, formatNumber) => {
  const docPdf = new jsPDF();
  const logoImg = await loadLogo();

  let totalGmv = 0, totalBase = 0, totalOrders = 0, totalUnits = 0, totalAds = 0;
  const canaisAtendidos = new Set();
  const storeRows = [];

  // Agregação dos dados operacionais das lojas
  clientStores.forEach((store, idx) => {
    totalGmv += store.reportGmv; 
    totalBase += store.reportBase;
    totalOrders += store.reportOrders; 
    totalUnits += store.reportUnits; 
    totalAds += store.reportAds;

    if (store.marketplace) canaisAtendidos.add(store.marketplace);

    const storeEvolucao = store.reportBase > 0 ? (store.reportGmv - store.reportBase) / store.reportBase : 0;
    const storeRoas = store.reportAds > 0 ? store.reportGmv / store.reportAds : 0;
    
    // CORREÇÃO: Fallback Inteligente de Conversões
    const conversoesLoja = store.reportUnits > 0 ? store.reportUnits : store.reportOrders;
    const cac = conversoesLoja > 0 ? store.reportAds / conversoesLoja : 0;

    storeRows.push([ 
      `${idx + 1}º`, 
      store.marketplace || '-', 
      store.store || '-', 
      formatCurrency(store.reportGmv), 
      (storeEvolucao > 0 ? '+' : '') + (storeEvolucao * 100).toFixed(2) + '%', 
      `${formatNumber(conversoesLoja)} conv.`, // Formatação adaptada
      formatCurrency(store.reportAds), 
      storeRoas > 0 ? storeRoas.toFixed(2) + 'x' : '-', 
      formatCurrency(cac) 
    ]);
  });

  // Renderizar Cabeçalho e Bloco de Destaque
  renderHeader(docPdf, clientName, 'RELATÓRIO EXECUTIVO DE PERFORMANCE', periodoApurado, logoImg, dataGeracao);

  docPdf.setFontSize(11); docPdf.setTextColor(75, 85, 99); 
  docPdf.text('Faturamento na Competência:', 14, 58);
  docPdf.setFontSize(22); docPdf.setTextColor(16, 185, 129); 
  docPdf.text(formatCurrency(totalGmv), 14, 68);

  // Tabela de Lojas
  autoTable(docPdf, {
    startY: 78,
    head: [['Rk', 'Canal', 'Loja', 'Faturamento', 'Evolução', 'Conversões', 'ADS', 'ROAS', 'Custo por Conversão']],
    body: storeRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 4 },
    columnStyles: { 0: { halign: 'center' }, 4: { halign: 'center' }, 7: { halign: 'center' } },
    alternateRowStyles: { fillColor: [249, 250, 251] }
  });

  // Bloco de Resumo Final
  let finalY = docPdf.lastAutoTable.finalY + 12;
  if (finalY + 50 > docPdf.internal.pageSize.height) { docPdf.addPage(); finalY = 20; }
  
  docPdf.setFillColor(248, 250, 252); docPdf.setDrawColor(226, 232, 240);
  docPdf.roundedRect(14, finalY, 182, 45, 3, 3, 'FD');

  docPdf.setFontSize(11); docPdf.setTextColor(30, 41, 59); docPdf.setFont('helvetica', 'bold');
  docPdf.text('Resumo Global do Período', 20, finalY + 8);

  docPdf.setFontSize(9); docPdf.setTextColor(71, 85, 105); docPdf.setFont('helvetica', 'normal');
  const totalEvolucao = totalBase > 0 ? (totalGmv - totalBase) / totalBase : 0;
  const totalRoas = totalAds > 0 ? totalGmv / totalAds : 0;
  
  const totalConversoes = totalUnits > 0 ? totalUnits : totalOrders;
  const cacGlobal = totalConversoes > 0 ? totalAds / totalConversoes : 0;

  docPdf.text(`Canais Ativados: ${Array.from(canaisAtendidos).join(', ')}`, 20, finalY + 18);
  docPdf.text(`Crescimento do Faturamento (MoM): ${totalEvolucao > 0 ? '+' : ''}${(totalEvolucao * 100).toFixed(2)}%`, 20, finalY + 26);
  docPdf.text(`Volume de Vendas: ${formatNumber(totalConversoes)} ${totalUnits > 0 ? 'unidades' : 'pedidos'}`, 20, finalY + 34);
  
  docPdf.text(`Investimento Total em ADS: ${formatCurrency(totalAds)}`, 110, finalY + 18);
  docPdf.text(`ROAS Médio Consolidado: ${totalRoas > 0 ? totalRoas.toFixed(2) + 'x' : '-'}`, 110, finalY + 26);
  docPdf.text(`Custo por Conversão: ${formatCurrency(cacGlobal)}`, 110, finalY + 34);

  // Destaques Sazonais de Eventos embutidos
  let clientEventGmv = 0;
  const eventsParticipated = new Set();
  clientStores.forEach(s => {
    if (s.reportEvents) {
      Object.entries(s.reportEvents).forEach(([eName, eData]) => {
        clientEventGmv += Number(eData.gmv) || 0;
        eventsParticipated.add(eName);
      });
    }
  });

  if (clientEventGmv > 0) {
    let eventY = finalY + 50;
    if (eventY + 30 > docPdf.internal.pageSize.height) { docPdf.addPage(); eventY = 20; }
    
    docPdf.setFillColor(255, 247, 237); docPdf.setDrawColor(253, 186, 116);
    docPdf.roundedRect(14, eventY, 182, 28, 3, 3, 'FD');

    docPdf.setFontSize(10); docPdf.setTextColor(194, 65, 12); docPdf.setFont('helvetica', 'bold');
    docPdf.text(`DESTAQUES SAZONAIS: ${Array.from(eventsParticipated).join(', ')}`, 20, eventY + 7);

    docPdf.setFontSize(9); docPdf.setTextColor(154, 52, 18); docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Faturamento gerado nos eventos: ${formatCurrency(clientEventGmv)}`, 20, eventY + 15);
    docPdf.text(`Impacto de Receita em Campanhas Ativas.`, 20, eventY + 22);
  }

  return docPdf;
};

/**
 * FUNÇÃO 2: Gera o Relatório de Campanhas da War Room (Sem Métricas de Ads)
 */
export const generateEventReportPDF = async (eventName, clientName, clientStores, dataGeracao, formatCurrency, formatNumber, currentDay) => {
  const docPdf = new jsPDF();
  const logoImg = await loadLogo();

  let totalGmv = 0, totalOrders = 0, totalUnits = 0;
  const canaisAtendidos = new Set();
  const storeRows = [];

  const eventDay = currentDay || new Date().getDate();
  const daysBefore = Math.max(1, eventDay - 1);

  clientStores.forEach((s, idx) => {
    const ev = (s.eventLogs && s.eventLogs[eventName]) || { gmv: 0, orders: 0, units: 0 };
    const gmv = Number(ev.gmv) || 0;
    const orders = Number(ev.orders) || 0;
    const units = Number(ev.units) || 0;

    const totalAccumulatedNow = Number(s.currentRevenue) || 0;
    const revenueBefore = Math.max(0, totalAccumulatedNow - gmv);
    const dailyAvgBefore = eventDay > 1 ? revenueBefore / daysBefore : 0;
    const vsMedia = dailyAvgBefore > 0 ? ((gmv - dailyAvgBefore) / dailyAvgBefore) * 100 : 0;

    totalGmv += gmv; totalOrders += orders; totalUnits += units;
    if (s.marketplace) canaisAtendidos.add(s.marketplace);

    storeRows.push([
      `${idx + 1}º`,
      s.marketplace || '-',
      s.store || '-',
      formatCurrency(gmv),
      vsMedia > 0 ? `+${vsMedia.toFixed(1)}%` : (vsMedia < 0 ? `${vsMedia.toFixed(1)}%` : '-'),
      `${formatNumber(orders)}`,
      `${formatNumber(units)}`
    ]);
  });

  renderHeader(docPdf, clientName, 'RELATÓRIO DE DESEMPENHO - CAMPANHA SAZONAL', `Campanha: ${eventName}`, logoImg, dataGeracao);

  docPdf.setFontSize(11); docPdf.setTextColor(75, 85, 99); 
  docPdf.text('Faturamento Realizado no Evento:', 14, 58);
  docPdf.setFontSize(22); docPdf.setTextColor(234, 88, 12); // Laranja War Room
  docPdf.text(formatCurrency(totalGmv), 14, 68);

  autoTable(docPdf, {
    startY: 78,
    head: [['Rk', 'Canal', 'Loja', 'Faturamento', 'Vs Média/Dia', 'Pedidos', 'Unidades']],
    body: storeRows,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
    alternateRowStyles: { fillColor: [255, 247, 237] }
  });

  let finalY = docPdf.lastAutoTable.finalY + 12;
  if (finalY + 40 > docPdf.internal.pageSize.height) { docPdf.addPage(); finalY = 20; }
  
  docPdf.setFillColor(255, 247, 237); docPdf.setDrawColor(253, 186, 116);
  docPdf.roundedRect(14, finalY, 182, 25, 3, 3, 'FD');

  docPdf.setFontSize(11); docPdf.setTextColor(154, 52, 18); docPdf.setFont('helvetica', 'bold');
  docPdf.text('Resumo da Operação', 20, finalY + 8);

  docPdf.setFontSize(9); docPdf.setTextColor(194, 65, 12); docPdf.setFont('helvetica', 'normal');
  docPdf.text(`Canais Ativados: ${Array.from(canaisAtendidos).join(', ')}`, 20, finalY + 18);
  docPdf.text(`Total Entregue: ${formatNumber(totalUnits)} unidades (${formatNumber(totalOrders)} pedidos)`, 110, finalY + 18);

  return docPdf;
};
