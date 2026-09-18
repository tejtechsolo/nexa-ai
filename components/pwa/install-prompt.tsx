'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

declare global {
  interface Window {
    __nexaInstallPrompt?: InstallEvent;
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window));

    const handler = (event: Event) => {
      event.preventDefault();
      const typed = event as InstallEvent;
      window.__nexaInstallPrompt = typed;
      setInstallEvent(typed);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstallEvent(null));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone || dismissed || (!installEvent && !isIOS)) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <Download className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
      <div className="flex-1">
        <p className="font-semibold">Install NexaAI</p>
        {isIOS ? (
          <p className="mt-1 text-sm text-slate-300">In Safari, tap Share, then choose “Add to Home Screen”.</p>
        ) : (
          <p className="mt-1 text-sm text-slate-300">Use NexaAI like a desktop or mobile app with a dedicated window.</p>
        )}
        {installEvent && <button onClick={install} className="mt-3 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold hover:bg-violet-400">Install now</button>}
      </div>
      <button aria-label="Dismiss install prompt" onClick={() => setDismissed(true)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
    </aside>
  );
}
