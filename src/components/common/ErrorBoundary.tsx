import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error no controlado en componente:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
          <div className="bg-white border-2 border-red-100 rounded-[32px] p-8 max-w-lg w-full shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight mb-2">
              {this.props.fallbackTitle || 'Ha ocurrido un error en este módulo'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
              Ocurrió un problema inesperado al renderizar esta sección. Puedes recargar el módulo sin perder tu sesión.
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/25 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar Módulo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
