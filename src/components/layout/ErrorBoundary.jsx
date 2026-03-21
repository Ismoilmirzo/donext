import { Component } from 'react';
import { getStoredLocale, translate } from '../../lib/i18n';
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
      const locale = getStoredLocale();
      return (
        <div className="dn-page-shell flex min-h-screen items-center justify-center px-4">
          <Card className="max-w-lg text-center">
            <h2 className="text-xl font-semibold text-slate-100">{translate(locale, 'error.title')}</h2>
            <p className="mt-2 text-sm text-slate-400">{translate(locale, 'error.body')}</p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>{translate(locale, 'common.reload')}</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
