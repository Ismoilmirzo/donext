import { useEffect, useId, useRef } from 'react';
import { TELEGRAM_BOT_USERNAME } from '../../lib/telegram';

export default function TelegramLoginWidget({ className = '', cornerRadius = 12, disabled = false, onAuth, requestAccess = 'write', size = 'large' }) {
  const containerRef = useRef(null);
  const callbackName = `__donextTelegramAuth_${useId().replace(/[^a-zA-Z0-9_]/g, '')}`;

  useEffect(() => {
    if (!containerRef.current || !TELEGRAM_BOT_USERNAME) return undefined;

    window[callbackName] = (user) => {
      if (!disabled) {
        onAuth?.(user);
      }
    };
    window.__donextTelegramAuthWidgetCallbacks = window.__donextTelegramAuthWidgetCallbacks || {};
    window.__donextTelegramAuthWidgetCallbacks[callbackName] = window[callbackName];
    window.__donextTelegramAuthWidgetLastCallback = callbackName;

    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', size);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    containerRef.current.appendChild(script);

    return () => {
      delete window[callbackName];
      if (window.__donextTelegramAuthWidgetCallbacks) {
        delete window.__donextTelegramAuthWidgetCallbacks[callbackName];
      }
    };
  }, [callbackName, cornerRadius, disabled, onAuth, requestAccess, size]);

  if (!TELEGRAM_BOT_USERNAME) return null;

  return (
    <div className={`relative min-h-[42px] ${className}`}>
      <div ref={containerRef} />
      {disabled && <div className="absolute inset-0 rounded-xl bg-slate-950/45" aria-hidden="true" />}
    </div>
  );
}
