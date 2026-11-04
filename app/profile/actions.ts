'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadProfileAvatar(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Unable to verify user before profile avatar upload:', userError.message);
    return { error: 'ยืนยันบัญชีไม่สำเร็จ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่' };
  }
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนรูปโปรไฟล์' };

  const file = formData.get('avatar');
  if (!(file instanceof File)) return { error: 'กรุณาเลือกรูปภาพก่อนอัปโหลด' };
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) return { error: 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP' };
  if (file.size < 1 || file.size > MAX_AVATAR_SIZE) return { error: 'รูปภาพต้องมีขนาดไม่เกิน 3 MB' };

  const avatarPath = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from('profile-avatars')
    .upload(avatarPath, file, { cacheControl: '0', contentType: file.type, upsert: true });

  if (uploadError) {
    console.error('Unable to upload profile avatar:', uploadError.message);
    return { error: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง' };
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { avatar_path: avatarPath, avatar_updated_at: new Date().toISOString() },
  });

  if (metadataError) {
    console.error('Unable to save profile avatar metadata:', metadataError.message);
    return { error: 'อัปโหลดรูปแล้ว แต่บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง' };
  }

  revalidatePath('/', 'layout');
  return {};
}
