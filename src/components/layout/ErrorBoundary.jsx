import { Component } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Unhandled UI error:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
          <Card className="max-w-lg text-center">
            <h2 className="text-xl font-semibold text-slate-100">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-400">Please refresh the page. If this keeps happening, send feedback from Settings.</p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
