import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast'; 

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.toString() };
  }

  componentDidCatch(error, errorInfo) {
    // O erro continua sendo impresso no F12 com todos os detalhes
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
    
    toast.error("Falha em um módulo! Abra o console (F12) para ver os detalhes do erro.", {
      duration: 8000,
      id: 'error-boundary-toast'
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-red-900/10 border border-red-500/20 rounded-2xl">
          <AlertTriangle size={32} className="text-red-400 mb-2" />
          <h2 className="text-lg font-bold text-white mb-1">Ops! Algo deu errado neste módulo.</h2>
          <p className="text-xs text-red-300">Nossa equipe técnica já foi notificada. Tente recarregar a página.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
