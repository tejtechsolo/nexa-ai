import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() { return <><h1 className="text-2xl font-semibold">Sign in to NexaAI</h1><p className="mb-6 mt-2 text-sm text-slate-400">Continue to your intelligent workspace.</p><AuthForm mode="login" /><div className="mt-6 flex justify-between text-sm text-slate-400"><Link href="/forgot-password" className="hover:text-white">Forgot password?</Link><Link href="/signup" className="hover:text-white">Create account</Link></div></>; }
