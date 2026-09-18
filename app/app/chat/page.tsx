// Persistent chat workspace: conversation list, history, create/delete, and message persistence.
'use client';

import { FormEvent, useEffect, useState } from 'react';

type Conversation = { id: string; title: string; model: string; updated_at: string };
type Message = { id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at: string };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');

  async function loadConversation(id: string) {
    setActiveId(id);
    setError('');
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load conversation');
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load conversation');
    }
  }

  async function loadConversations() {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/conversations', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load conversations');
      setConversations(data.conversations);
      if (data.conversations.length) await loadConversation(data.conversations[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  }

  async function createConversation(title = 'New conversation') {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to create conversation');
    setConversations((current) => [data.conversation, ...current]);
    setActiveId(data.conversation.id);
    setMessages([]);
    return data.conversation.id as string;
  }

  useEffect(() => { void loadConversations(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    setError('');
    setLoading(true);

    try {
      const conversationId = activeId ?? await createConversation(content.slice(0, 60));
      const history = [...messages, { role: 'user' as const, content }];
      setMessages((current) => [...current, {
        id: `local-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(),
      }]);
      setInput('');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, messages: history }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }

      if (!response.body) throw new Error('Streaming is not supported by this response');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      setStreamingText('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        answer += chunk;
        setStreamingText(answer);
      }

      setStreamingText('');
      setMessages((current) => [...current, {
        id: `local-assistant-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString(),
      }]);
      setConversations((current) => current.map((item) =>
        item.id === conversationId
          ? { ...item, title: item.title === 'New conversation' ? content.slice(0, 60) : item.title, updated_at: new Date().toISOString() }
          : item,
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    const remaining = conversations.filter((item) => item.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
      if (remaining[0]) await loadConversation(remaining[0].id);
      else setMessages([]);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-sm text-cyan-300">NexaAI</p><h1 className="font-semibold">Conversations</h1></div>
            <button onClick={() => void createConversation()} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">New</button>
          </div>
          <div className="space-y-2">
            {loadingConversations && <p className="text-sm text-slate-500">Loading…</p>}
            {conversations.map((conversation) => (
              <div key={conversation.id} className={`group flex items-center gap-2 rounded-xl border p-2 ${activeId === conversation.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-transparent hover:bg-white/5'}`}>
                <button onClick={() => void loadConversation(conversation.id)} className="min-w-0 flex-1 truncate text-left text-sm">{conversation.title}</button>
                <button onClick={() => void deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`} className="hidden rounded px-2 text-xs text-red-300 group-hover:block">×</button>
              </div>
            ))}
          </div>
        </aside>
        <section className="flex min-h-screen flex-col">
          <header className="border-b border-white/10 px-6 py-4"><a href="/app" className="text-sm text-slate-400 hover:text-white">← Workspace</a></header>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-8">
            {messages.length === 0 && <div className="mx-auto mt-20 max-w-xl text-center"><h2 className="text-3xl font-semibold">How can NexaAI help?</h2><p className="mt-3 text-slate-400">Your conversations are stored securely in your account.</p></div>}
            {messages.map((message) => (
              <div key={message.id} className={`max-w-3xl rounded-2xl border p-4 ${message.role === 'user' ? 'ml-auto border-cyan-400/20 bg-cyan-400/10' : 'border-white/10 bg-white/[0.04]'}`}>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">{message.role}</p>
                <div className="whitespace-pre-wrap leading-7 text-slate-100">{message.content}</div>
              </div>
            ))}
            {loading && <div className="max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-100"><p className="mb-2 text-xs uppercase tracking-wide text-slate-500">assistant · streaming</p><div className="whitespace-pre-wrap leading-7">{streamingText || 'NexaAI is thinking…'}</div></div>}
          </div>
          <form onSubmit={submit} className="border-t border-white/10 p-5">
            {error && <p className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <div className="mx-auto flex max-w-4xl gap-3">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} maxLength={100000} placeholder="Message NexaAI…" className="min-h-24 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none focus:border-cyan-400" />
              <button disabled={loading || !input.trim()} className="self-end rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Thinking…' : 'Send'}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
