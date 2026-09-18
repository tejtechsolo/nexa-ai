import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function SignupPage() { return <><h1 className="text-2xl font-semibold">Create your NexaAI account</h1><p className="mb-6 mt-2 text-sm text-slate-400">Start building your personal AI workspace.</p><AuthForm mode="signup" /><p className="mt-6 text-center text-sm text-slate-400">Already registered? <Link href="/login" className="text-cyan-300">Sign in</Link></p></>; }
