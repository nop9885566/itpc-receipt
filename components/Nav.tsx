import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function logout() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default function Nav() {
  return (
    <nav className="nav">
      <strong>ใบเสร็จรับเงิน</strong>
      <Link href="/receipts">รายการใบเสร็จ</Link>
      <Link href="/receipts/new">ออกใบเสร็จใหม่</Link>
      <form action={logout}><button className="btn secondary" type="submit">ออกจากระบบ</button></form>
    </nav>
  );
}
