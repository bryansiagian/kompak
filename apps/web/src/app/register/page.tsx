import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/register-form';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.auth.register.submit };

export default function RegisterPage() {
  return <RegisterForm />;
}