import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Frontend rendering error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
          <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center shadow-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-600">
              Application error
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              This page could not be displayed.
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              Refresh the page and try again. If the problem continues, share the
              request time with the project administrator.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-extrabold text-white"
            >
              Reload application
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
