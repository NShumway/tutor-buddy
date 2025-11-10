import { redirect } from 'next/navigation';
import { getCurrentStudent } from '@/lib/auth';

export default async function Home() {
  const student = await getCurrentStudent();

  if (student) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
