'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AI_MODELS, DAILY_REQUEST_LIMIT } from '@/lib/ai/models';
import { MarkdownMessage } from '@/components/chat/markdown-message';

type Conversation = { id: string; title: string; model: string; updated_at: string };
type Message = { id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at: string };

const SUGGESTIONS = [
  'Explain a complex topic in simple terms',
  'Help me plan my next project',
  'Review this code and suggest improvements',
  'Create a step-by-step learning roadmap',
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [remaining, setRemaining] = useState(DAILY_REQUEST_LIMIT);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? conversations.filter((item) => item.title.toLowerCase().includes(term)) : conversations;
  }, [conversations, search]);

  async function loadConversation(id: string) {
    setActiveId(id);
    setError('');
    setSidebarOpen(false);
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load conversation');
      setMessages(data.messages);
      const conversation = conversations.find((item) => item.id === id);
      if (conversation?.model) setModel(conversation.model);
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

  async function refreshUsage() {
    const response = await fetch('/api/usage', { cache: 'no-store' });
    const data = await response.json();
    if (typeof data.remaining === 'number') setRemaining(data.remaining);
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
    setSidebarOpen(false);
    return data.conversation.id as string;
  }

  useEffect(() => {
    void loadConversations();
    void refreshUsage().catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? 'smooth' : 'auto' });
  }, [messages, streamingText, loading]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('conversation-search')?.focus();
      }
      if (event.key === 'Escape' && loading) {
        event.preventDefault();
        abortRef.current?.abort();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading]);

  async function streamChat(
    conversationId: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    action: 'send' | 'regenerate',
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, messages: history, model, action }),
      signal: controller.signal,
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

    const tail = decoder.decode();
    if (tail) {
      answer += tail;
      setStreamingText(answer);
    }

    const headerRemaining = response.headers.get('x-nexa-remaining');
    if (headerRemaining) setRemaining(Number(headerRemaining));
    setStreamingText('');
    return answer;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    await sendContent(content);
  }

  async function sendContent(content: string) {
    setError('');
    setLoading(true);
    try {
      const conversationId = activeId ?? await createConversation(content.slice(0, 60));
      const history = [...messages, { role: 'user' as const, content }];
      if (!activeId) setActiveId(conversationId);

      setMessages((current) => [...current, {
        id: `local-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(),
      }]);
      setInput('');

      const answer = await streamChat(conversationId, history, 'send');
      if (answer) {
        setMessages((current) => [...current, {
          id: `local-assistant-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString(),
        }]);
      }
      setConversations((current) => current.map((item) =>
        item.id === conversationId
          ? { ...item, title: item.title === 'New conversation' ? content.slice(0, 60) : item.title, model, updated_at: new Date().toISOString() }
          : item,
      ));
      await refreshUsage();
      await loadConversation(conversationId);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation stopped. The partial response, if any, was saved.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamingText('');
    }
  }

  async function regenerate() {
    if (loading || !activeId) return;
    const lastAssistantIndex = [...messages].map((m) => m.role).lastIndexOf('assistant');
    if (lastAssistantIndex < 0) return;
    const history = messages.slice(0, lastAssistantIndex);
    if (!history.some((message) => message.role === 'user')) return;

    setError('');
    setLoading(true);
    try {
      const answer = await streamChat(activeId, history, 'regenerate');
      setMessages((current) => [
        ...current.slice(0, lastAssistantIndex),
        ...(answer ? [{ id: `local-regenerated-${Date.now()}`, role: 'assistant' as const, content: answer, created_at: new Date().toISOString() }] : []),
      ]);
      await refreshUsage();
      await loadConversation(activeId);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unable to regenerate response');
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamingText('');
    }
  }

  async function copyText(content: string) {
    await navigator.clipboard.writeText(content);
  }

  async function editMessage(message: Message) {
    if (loading || message.role !== 'user' || !activeId) return;
    setEditingId(message.id);
    setEditingText(message.content);
  }

  async function saveEdit() {
    if (!activeId || !editingId || !editingText.trim() || loading) return;
    setError('');
    setLoading(true);
    try {
      const rewind = await fetch(`/api/conversations/${activeId}/rewind`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId: editingId }),
      });
      const rewindData = await rewind.json();
      if (!rewind.ok) throw new Error(rewindData.error || 'Unable to edit conversation');

      const kept = messages.slice(0, messages.findIndex((message) => message.id === editingId));
      const content = editingText.trim();
      setMessages(kept);
      setEditingId(null);
      setEditingText('');
      await sendContentWithExistingConversation(content, kept);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to edit message');
      setLoading(false);
    }
  }

  async function sendContentWithExistingConversation(content: string, previous: Message[]) {
    if (!activeId) return;
    const history = [...previous, { role: 'user' as const, content }];
    setMessages([...previous, {
      id: `local-user-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(),
    }]);
    setInput('');
    try {
      const answer = await streamChat(activeId, history, 'send');
      if (answer) setMessages((current) => [...current, {
        id: `local-assistant-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString(),
      }]);
      await refreshUsage();
      await loadConversation(activeId);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unable to send edited message');
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamingText('');
    }
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    const next = conversations.filter((item) => item.id !== id);
    setConversations(next);
    if (activeId === id) {
      if (next[0]) await loadConversation(next[0].id);
      else {
        setActiveId(null);
        setMessages([]);
      }
    }
  }

  async function renameConversation(id: string) {
    const title = renameText.trim().slice(0, 120);
    if (!title) return;
    const response = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to rename conversation');
      return;
    }
    setConversations((current) => current.map((item) => item.id === id ? { ...item, title } : item));
    setRenamingId(null);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {sidebarOpen && <button aria-label="Close conversations" className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-30 w-80 border-r border-white/10 bg-[#070b14] p-4 transition-transform md:static md:block md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-sm text-cyan-300">NexaAI</p><h1 className="font-semibold">Conversations</h1></div>
            <button onClick={() => void createConversation()} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">New</button>
          </div>
          <input id="conversation-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations · Ctrl K" className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-cyan-400" />
          <div className="space-y-2 overflow-y-auto">
            {loadingConversations && <p className="text-sm text-slate-500">Loading…</p>}
            {filteredConversations.map((conversation) => (
              <div key={conversation.id} className={`group rounded-xl border p-2 ${activeId === conversation.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-transparent hover:bg-white/5'}`}>
                {renamingId === conversation.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); void renameConversation(conversation.id); }} className="flex gap-1">
                    <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} className="min-w-0 flex-1 rounded bg-black/30 px-2 py-1 text-sm outline-none" />
                    <button className="px-2 text-xs text-cyan-300">Save</button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => void loadConversation(conversation.id)} className="min-w-0 flex-1 truncate text-left text-sm">{conversation.title}</button>
                    <button aria-label="Rename conversation" onClick={() => { setRenamingId(conversation.id); setRenameText(conversation.title); }} className="hidden rounded px-1 text-xs text-slate-400 group-hover:block">✎</button>
                    <button aria-label={`Delete ${conversation.title}`} onClick={() => void deleteConversation(conversation.id)} className="hidden rounded px-1 text-xs text-red-300 group-hover:block">×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-white/10 px-3 py-2 text-sm md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">☰</button>
              <a href="/app" className="text-sm text-slate-400 hover:text-white">← Workspace</a>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">{remaining}/{DAILY_REQUEST_LIMIT} requests left</span>
              <select value={model} onChange={(event) => setModel(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                {AI_MODELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-4xl space-y-5">
              {messages.length === 0 && !loading && (
                <div className="mx-auto mt-16 max-w-2xl text-center">
                  <div className="mb-4 text-4xl">✦</div>
                  <h2 className="text-3xl font-semibold">How can NexaAI help?</h2>
                  <p className="mt-3 text-slate-400">Ask questions, draft content, analyze ideas, or work through code with your AI workspace.</p>
                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button key={suggestion} onClick={() => { setInput(suggestion); inputRef.current?.focus(); }} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-sm text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-400/5">{suggestion}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <article key={message.id} className={`group max-w-4xl rounded-2xl border p-4 ${message.role === 'user' ? 'ml-auto border-cyan-400/20 bg-cyan-400/10' : 'border-white/10 bg-white/[0.04]'}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{message.role} · {formatTime(message.created_at)}</p>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => void copyText(message.content)} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white">Copy</button>
                      {message.role === 'user' && <button onClick={() => void editMessage(message)} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white">Edit</button>}
                      {message.role === 'assistant' && index === messages.length - 1 && <button onClick={() => void regenerate()} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white">Regenerate</button>}
                    </div>
                  </div>
                  {editingId === message.id ? (
                    <div className="space-y-2">
                      <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={4} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-cyan-400" />
                      <div className="flex gap-2">
                        <button onClick={() => void saveEdit()} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950">Save & send</button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : message.role === 'assistant' ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-7 text-slate-100">{message.content}</p>
                  )}
                </article>
              ))}

              {loading && (
                <article className="max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">assistant · streaming</p>
                  {streamingText ? <MarkdownMessage content={streamingText} /> : <div className="flex items-center gap-2 text-slate-400"><span className="animate-pulse">●</span> NexaAI is thinking…</div>}
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <form onSubmit={submit} className="border-t border-white/10 p-4 md:p-5">
            {error && <p className="mx-auto mb-3 max-w-4xl rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <div className="mx-auto max-w-4xl">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  rows={3}
                  maxLength={100000}
                  placeholder="Message NexaAI…  (Ctrl/Cmd + Enter to send)"
                  className="min-h-24 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none focus:border-cyan-400"
                />
                {loading ? (
                  <button type="button" onClick={() => abortRef.current?.abort()} className="self-end rounded-xl border border-red-400/40 px-5 py-3 font-semibold text-red-200 hover:bg-red-400/10">Stop</button>
                ) : (
                  <button disabled={!input.trim()} className="self-end rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">Send</button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600">NexaAI may make mistakes. Verify important information.</p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
