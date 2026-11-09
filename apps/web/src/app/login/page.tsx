import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/login-form';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.auth.login.submit };

export default function LoginPage() {
  return <LoginForm />;
}