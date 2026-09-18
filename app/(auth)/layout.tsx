import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-6 py-12 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl"><Link href="/" className="mb-8 block text-xl font-bold">Nexa<span className="text-cyan-300">AI</span></Link>{children}</section></main>;
}
