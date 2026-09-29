import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 bg-red-100 text-[#FF3B30] rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold shadow-sm">
            !
          </div>
          <h2 className="text-xl font-bold text-black mb-2">ആപ്പിൽ ഒരു തകരാറുണ്ടായി</h2>
          <p className="text-sm text-[#8E8E93] max-w-xs mb-4">
            An unexpected error occurred while loading the app.
          </p>
          <div className="bg-white p-3 rounded-xl border border-black/5 text-left text-xs font-mono text-red-600 max-w-sm w-full overflow-x-auto mb-6 max-h-36">
            {this.state.error?.toString()}
          </div>
          <div className="space-y-2 w-full max-w-xs">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#007AFF] text-white rounded-xl font-semibold text-sm shadow-md active:opacity-85"
            >
              വീണ്ടും ശ്രമിക്കുക (Reload)
            </button>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-white text-[#8E8E93] rounded-xl font-medium text-xs border border-black/5 active:bg-gray-50"
            >
              ക്യാഷ് മായ്ക്കുക (Reset Local Cache)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
