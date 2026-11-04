'use client';

import { useFormStatus } from 'react-dom';

export default function FormSubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
