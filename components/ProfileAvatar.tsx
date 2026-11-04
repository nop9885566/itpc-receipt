'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AppIcon from '@/components/AppIcon';
import { uploadProfileAvatar } from '@/app/profile/actions';

export default function ProfileAvatar({ initial, avatarUrl }: { initial: string; avatarUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsError(false);
    setFeedback('กำลังอัปโหลดรูป...');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('avatar', file);
        const result = await uploadProfileAvatar(formData);
        if (result.error) {
          setIsError(true);
          setFeedback(result.error);
          return;
        }
        setIsError(false);
        setFeedback('เปลี่ยนรูปโปรไฟล์แล้ว');
        router.refresh();
      } catch (error) {
        console.error('Profile avatar upload failed unexpectedly:', error);
        setIsError(true);
        setFeedback('อัปโหลดรูปไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
      }
    });
  }

  return (
    <>
      <button
        className="account-avatar"
        type="button"
        aria-label="เปลี่ยนรูปโปรไฟล์"
        title="เปลี่ยนรูปโปรไฟล์"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
        <span className="account-avatar-edit"><AppIcon name="camera" size={13} /></span>
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="เลือกรูปโปรไฟล์"
        onChange={onFileChange}
      />
      {feedback && (
        <span className={`profile-avatar-feedback${isError ? ' error' : ''}`} role={isError ? 'alert' : 'status'}>
          {pending ? 'กำลังอัปโหลดรูป...' : feedback}
        </span>
      )}
    </>
  );
}
