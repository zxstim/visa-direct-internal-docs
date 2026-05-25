import { SignUpForm } from '@/components/auth/sign-up-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create an account to access the documentation',
};

export default function SignUpPage() {
  return <SignUpForm />;
}
