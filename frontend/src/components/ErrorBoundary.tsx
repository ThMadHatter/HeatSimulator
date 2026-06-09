import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 bg-red-50 p-8 flex flex-col items-center justify-center text-red-900 border-2 border-red-200 m-4 rounded-lg shadow-inner">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="mb-6 text-center max-w-md">
            The thermal simulator encountered an unexpected error. This might be due to invalid input parameters or a computation crash.
          </p>

          <div className="bg-white p-4 rounded border border-red-200 w-full max-w-2xl overflow-auto mb-6 shadow-sm">
            <p className="font-bold mb-2">Error Message:</p>
            <code className="text-sm text-red-600 block mb-4">{this.state.error?.message}</code>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <>
                <p className="font-bold mb-2">Stack Trace:</p>
                <pre className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded">
                  {this.state.errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-colors shadow-lg"
          >
            Reset Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
