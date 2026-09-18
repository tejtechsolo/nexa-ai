import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function ForgotPasswordPage() { return <><h1 className="text-2xl font-semibold">Reset your password</h1><p className="mb-6 mt-2 text-sm text-slate-400">Enter your email and we’ll send recovery instructions.</p><AuthForm mode="forgot" /><p className="mt-6 text-center text-sm text-slate-400"><Link href="/login" className="text-cyan-300">Back to sign in</Link></p></>; }
