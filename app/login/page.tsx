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
    <main className="login-screen">
      <section className="login-intro">
        <div className="login-intro-mark">
          <span className="login-brand-logo" role="img" aria-label="ระบบใบเสร็จ Receipt System" />
        </div>
        <div className="login-intro-copy">
          <span className="login-intro-kicker">ระบบงานภายใน</span>
          <h1>ระบบใบเสร็จรับเงิน</h1>
          <p>สำหรับบันทึกการรับชำระ ออกใบเสร็จ และดูแลสต็อกสินค้า</p>
        </div>
        <div className="login-intro-footer">กรุณาใช้บัญชีเจ้าหน้าที่ที่ผู้ดูแลระบบจัดเตรียมไว้</div>
      </section>
      <section className="login-form-area">
        <form action={login} className="login-card">
          <span className="login-form-kicker">ยินดีต้อนรับ</span>
          <h2>เข้าสู่ระบบ</h2>
          <p>กรอกอีเมลและรหัสผ่านเพื่อดำเนินงานต่อ</p>
          <div className="field">
            <label htmlFor="email">อีเมล</label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="name@school.ac.th" required />
          </div>
          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className="error" role="alert">เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่านแล้วลองอีกครั้ง</p>}
          <FormSubmitButton pendingLabel="กำลังเข้าสู่ระบบ...">เข้าสู่ระบบ</FormSubmitButton>
          <div className="login-help">หากยังไม่มีบัญชีหรือเข้าสู่ระบบไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</div>
        </form>
      </section>
    </main>
  );
}