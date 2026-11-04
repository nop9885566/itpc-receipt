'use client';

import { useActionState } from 'react';
import { logout } from '@/app/logout/actions';

export default function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { error: '' });

  return (
    <form action={action}>
      <button className="btn secondary" type="submit" disabled={pending}>
        {pending ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
      </button>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
