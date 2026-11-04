'use client';
import AppIcon from '@/components/AppIcon';
export default function PrintButton() {
  return <button className="btn secondary" onClick={() => window.print()}><AppIcon name="receipt" size={18} /> พิมพ์</button>;
}
