# Changelog (Histórico de Atualizações)
Todas as mudanças notáveis no projeto Avante HUB serão documentadas neste arquivo.

## [2.5.10] - 2026-05-30
### Adicionado
- **Controle de Versão:** Criação e inclusão do sistema de Changelog para documentar o histórico de atualizações e mudanças da plataforma.

### Modificado
- **Painel do Cliente (`ClientFileModal`):** Otimização e simplificação na conversão de números de faturamento e anúncios, evitando bugs com separadores de milhar na edição.
- **Dashboard Executivo (`ExecutiveDashboard`):** 
  - Removido o cálculo do gráfico histórico de dentro do componente visual. Agora o Dashboard recebe a métrica de evolução diretamente do motor central (`dashboardData`), aumentando a performance.
  - Aprimoramento da inteligência do Tooltip (caixa de informações flutuante) para ocultar metas em meses passados, garantindo uma leitura de dados mais clara.
- **Exportação (`ExportModal`):** Refinamento no manuseio da data de competência e melhoria na lógica para incluir/ocultar a exportação do backup (JSON) dependendo do nível de acesso.

---

## [2.5.9] - 2026-05-29
### Modificado
- Melhoria contínua e blindagem no tratamento de dados e proteção de conversão numérica nos componentes principais da aplicação (`App`, `ClientFileModal`, `ExecutiveDashboard` e `ExportModal`).

---

## [2.5.7] - 2026-05-29
### Adicionado
- **Fechamento de Mês:** Implementação do modal de fechamento de mês com input nativo de calendário.
- **Painel de Clientes:** Adicionada linha de entrada individual para dados da loja e registro de mês retroativo no `ClientFileModal`.
- **Avisos de Descontinuação:** Inseridos alertas para a futura remoção do formulário de entrada retroativa, preparando o sistema para o novo fluxo histórico.
- **Métricas:** Inclusão de métricas de crescimento MoM (Month-over-Month) no Dashboard.

### Modificado
- **Dashboard Executivo:** Melhoria na visualização de dados históricos e inclusão de sistema de registro de alertas (logs).
- **Feed da Equipe:** Aprimoramento da lógica de filtros do `TeamFeedView` e refinamento do manuseio de dados.
- **Tarefas:** Adicionado histórico de logs de tarefas (Task Logging) no `TaskModal` para maior rastreabilidade.

### Corrigido
- Restauração e correção da funcionalidade de exclusão de meses retroativos (`App.jsx`).
- Correção na funcionalidade de exclusão de tarefas no Feed da Equipe.

---

## [2.4.8] - 2026-05-28
### Adicionado
- **Relatórios:** Nova opção para incluir/ocultar a Fatura da Assessoria (Agency Fee) durante a geração de relatórios.

### Modificado
- **Gestão de Tarefas (SLA):** Reestruturação completa do `BulkTaskModal` e `TaskModal` com a nova lógica de SLA e manuseio de dados iniciais.
- **Filtros Globais:** Aperfeiçoamento da funcionalidade de filtro global e inicialização no Feed da Equipe.
- Unificação do campo de "Responsável" para melhor atribuição de tarefas.

### Removido
- Remoção do sistema antigo de prioridades no manuseio de tarefas, substituído pela lógica de SLA.

---

## [2.4.0] - 2026-05-27
### Adicionado
- **SLA de Tarefas:** Implementação da nova lógica de SLA com melhor manuseio de prazos e datas de entrega.

### Modificado
- Atualização do gerenciamento de tarefas com inclusão de peso (weight) no `TaskModal` e `BulkTaskModal`.
- **Interface:** Melhoria no estilo dos botões do Feed da Equipe para maior compatibilidade com o Tema Escuro (Dark Mode).

---

## [2.3.0] - 2026-05-26
### Adicionado
- **Exportação Master:** Criação da funcionalidade completa de exportação de dados nos formatos PDF, Excel (XLSX) e Backup de Segurança (JSON).
- **PWA (Progressive Web App):** Adição do `manifest.json` e suporte PWA, permitindo instalação do aplicativo. Adicionados alertas (toast) para checagem de novas versões.
- **Usuários:** Suporte para inclusão de URL de Avatar na gestão da equipe.

### Modificado
- Melhorias de acessibilidade e responsividade no `index.html`.
- Feed da Equipe agora exibe pontuações de criação de tarefas e indicadores visuais mais claros.

---

## [2.2.0] - 2026-05-25 a 2026-05-23
### Adicionado
- Adição de filtro por responsável nas tarefas e sistema de pontuação no feed da equipe.

### Modificado
- **Refatoração Geral:** Reestruturação profunda dos componentes `TaskModal`, `TaskView` e `TeamFeedView` para melhoria de performance e experiência do usuário (UX).
- Melhorias gerais de responsividade no Painel do Cliente e visualização em telas ultrawide.

### Corrigido
- Correções de bugs na exibição do portfólio de lojas.
- Ajustes de nomenclatura na interface de tarefas.

---

## [2.0.0] - 2026-05-22 a 2026-05-20 (Avante HUB)
### Adicionado
- **Rebranding:** Conversão oficial do sistema para **Avante HUB**.
- **Play/Pause de Tarefas:** Novo suporte para pausar e retomar tarefas com resolução de conflitos, além de status de execução em tempo real no feed.
- **Feed da Equipe:** Criação e adição da central de comunicação e acompanhamento de tarefas da equipe.
- **Gráficos:** Inclusão de novos gráficos de inteligência sobre clientes.

### Modificado
- Ajustes e melhorias estruturais no Painel de Admin (Gestão de Usuários e Permissões).
- Layout do Dashboard reconstruído com grades flexíveis.

### Corrigido
- Correção crítica no sistema de cálculo e fechamento de mês.

### Removido
- Remoção da necessidade de atrelar responsáveis unicamente por lojas.
