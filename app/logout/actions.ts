'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function logout(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง' };
  redirect('/login');
}
