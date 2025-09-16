import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/app';

export function StatusBar() {
  const [status, setStatus] = useState<'connected'|'disconnected'|'checking'>('checking');
  const { llm } = useAppStore();

  const activeProvider = llm.providers.find(p => p.isActive)?.name ?? '—';
  const activeModel = llm.selectedModel?.id ?? 'no model';

  useEffect(() => {
    (window as any).electronAPI.checkLLMConnection().then((res: any) => {
      setStatus(res ? 'connected' : 'disconnected');
    }).catch(() => setStatus('disconnected'));
  }, []);
  return (
    <footer className="h-8 bg-gray-900 border-t border-gray-700 flex items-center px-4 text-sm text-gray-400">
      LLM: {status} &#8226; {activeProvider} &#8226; {activeModel}
    </footer>
  );
}
