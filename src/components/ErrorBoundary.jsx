import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-6 text-stone-800 font-sans">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-700" />
            </div>
            
            <h2 className="text-xl font-extrabold text-stone-900">
              Ops! Algo inesperado aconteceu.
            </h2>
            
            <p className="text-xs text-stone-600 leading-relaxed">
              O sistema encontrou um conflito de dados em cache no seu navegador. Clique no botão abaixo para restaurar e recarregar os dados limpos:
            </p>

            {this.state.error && (
              <pre className="p-3 bg-stone-100 rounded-xl text-[10px] text-stone-700 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpar Cache & Restaurar Sistema</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
