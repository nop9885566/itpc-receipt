import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FormSubmitButton from '@/components/FormSubmitButton';

async function login(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')).trim(),
    password: String(formData.get('password')),
  });
  if (error) redirect('/login?error=1');
  redirect('/receipts');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <form action={login} className="card login-card">
        <h1>เข้าสู่ระบบ</h1>
        <div className="field">
          <label htmlFor="email">อีเมล</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">รหัสผ่าน</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className="error" role="alert">เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่านแล้วลองอีกครั้ง</p>}
        <FormSubmitButton pendingLabel="กำลังเข้าสู่ระบบ...">เข้าสู่ระบบ</FormSubmitButton>
      </form>
    </main>
  );
}