import Link from 'next/link';
import { ArrowRight, Bot, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';

const features = [
  ['Multi-model intelligence', 'Switch between supported AI providers through one clean workspace.', BrainCircuit],
  ['Private by design', 'Secure authentication, tenant isolation, encrypted secrets, and permission-aware data access.', ShieldCheck],
  ['Agents and knowledge', 'Connect files, tools, and custom assistants to solve complex tasks.', Bot],
];

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-2 text-xl font-semibold"><span className="rounded-xl bg-violet-500/20 p-2 text-violet-300"><Sparkles size={18}/></span>NexaAI</div>
      <div className="flex items-center gap-3"><Link className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5" href="/login">Sign in</Link><Link className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950" href="/app">Open workspace</Link></div>
    </nav>
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-24 text-center">
      <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200"><Sparkles size={15}/> Intelligent work, beautifully unified</div>
      <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">Your AI workspace for <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">thinking bigger.</span></h1>
      <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400">Chat, research, analyze files, build assistants, and automate workflows in one secure, extensible platform.</p>
      <div className="mt-10 flex justify-center gap-4"><Link className="flex items-center gap-2 rounded-2xl bg-violet-500 px-6 py-3 font-semibold hover:bg-violet-400" href="/app">Start exploring <ArrowRight size={18}/></Link><Link className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-white/5" href="#features">Explore features</Link></div>
    </section>
    <section id="features" className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 md:grid-cols-3">{features.map(([title, description, Icon]) => { const FeatureIcon = Icon as typeof BrainCircuit; return <article key={title as string} className="rounded-3xl border border-slate-800 bg-white/[.03] p-7"><FeatureIcon className="mb-8 text-violet-300" size={26}/><h2 className="text-xl font-semibold">{title as string}</h2><p className="mt-3 leading-7 text-slate-400">{description as string}</p></article> })}</section>
  </main>;
}