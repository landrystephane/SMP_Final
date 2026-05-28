import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        copied: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null, copied: false };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to electron backend if available
        if (window.electronAPI && window.electronAPI.logFrontendError) {
            window.electronAPI.logFrontendError({
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            }).catch(console.error);
        } else {
            console.error("Uncaught error:", error, errorInfo);
        }
    }

    private handleCopyError = () => {
        const { error, errorInfo } = this.state;
        const errorText = `Error: ${error?.message}\n\nStack Trace:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}`;
        navigator.clipboard.writeText(errorText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-950/50 min-h-[60vh] rounded-2xl border border-rose-500/10">
                    <div className="p-6 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                        <AlertTriangle className="w-16 h-16 text-rose-500" />
                    </div>
                    
                    <h2 className="text-3xl font-black text-white tracking-tighter italic mb-4">
                        OUPS, <span className="text-rose-500">PROBLÈME INATTENDU</span>
                    </h2>
                    
                    <p className="text-slate-400 text-center max-w-lg mb-8 font-medium">
                        Cette section a rencontré un dysfonctionnement. Ne vous inquiétez pas, le reste de l'application fonctionne parfaitement. Vous pouvez retourner au tableau de bord ou réessayer.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center shadow-lg shadow-amber-500/20"
                        >
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Rafraîchir la page
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center border border-white/5"
                        >
                            <Home className="w-5 h-5 mr-2" />
                            Retour à l'accueil
                        </button>
                    </div>

                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-950 border-b border-slate-800">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                Rapport technique automatique
                            </span>
                            <button
                                onClick={this.handleCopyError}
                                className="flex items-center text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
                            >
                                {this.state.copied ? (
                                    <><Check className="w-4 h-4 mr-1" /> Copié !</>
                                ) : (
                                    <><Copy className="w-4 h-4 mr-1" /> Copier l'erreur</>
                                )}
                            </button>
                        </div>
                        <div className="p-4 text-xs font-mono text-slate-400 max-h-64 overflow-y-auto custom-scrollbar">
                            <p className="text-rose-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="whitespace-pre-wrap leading-relaxed opacity-70">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
