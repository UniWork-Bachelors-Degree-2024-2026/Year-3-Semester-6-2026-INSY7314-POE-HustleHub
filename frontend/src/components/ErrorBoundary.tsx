import { Component, type ErrorInfo, type ReactNode } from "react";
import { Brand } from "./Brand.tsx";
//React (2026) documents error boundaries which assisted this implementation.

// Last line of defence: if a page crashes, people see a calm screen with a way out instead of a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Only the technical detail goes to the console. Nothing from the error is shown on screen.
    console.error("Unexpected error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className='crash' role='alert'>
        <div className='crash-card'>
          <Brand />
          <h1>Something went wrong</h1>
          <p>That page ran into a problem. Your information is safe. Reload to carry on, or head back to the start.</p>
          <div className='crash-actions'>
            <button type='button' className='btn' onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className='btn btn-ghost' href='/'>
              Go to start
            </a>
          </div>
        </div>
      </div>
    );
  }
}

//Reference List
//React, 2026. Component: catching rendering errors with an error boundary. [online] Available at: <https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary> [Accessed 11 October 2026].
