import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function login(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) redirect('/login?error=1');
  redirect('/receipts');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container" style={{ maxWidth: 380 }}>
      <form action={login} className="card">
        <h2>เข้าสู่ระบบ</h2>
        <label htmlFor="email">อีเมล</label>
        <input id="email" name="email" type="email" required />
        <div style={{ height: 12 }} />
        <label htmlFor="password">รหัสผ่าน</label>
        <input id="password" name="password" type="password" required />
        {error && <p className="error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</p>}
        <div style={{ height: 12 }} />
        <button className="btn" type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
}
