'use client';

import { FormEvent, useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: input }] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-cyan-300">NexaAI workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">New conversation</h1>
        <p className="mt-2 text-slate-400">Ask a question and receive a response from your configured AI provider.</p>
      </div>
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <form onSubmit={submit} className="space-y-4">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask NexaAI anything..." rows={6} maxLength={100000} className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none focus:border-cyan-400" />
          <button disabled={loading || !input.trim()} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Thinking…' : 'Send message'}
          </button>
        </form>
        {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {answer && <div className="mt-6 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/60 p-5 leading-7 text-slate-100">{answer}</div>}
      </section>
    </main>
  );
}
