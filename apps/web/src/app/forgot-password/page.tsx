import type { Metadata } from 'next';
import { ForgotPasswordFlow } from '@/features/auth/forgot-password-flow';
import messages from '@/messages/id.json';

export const metadata: Metadata = {
  title: messages.auth.forgot.emailStep.title,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}