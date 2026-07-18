'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ScanNowButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleScan() {
    setLoading(true);
    try {
      await fetch(`/api/sites/${siteId}/scan`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleScan}
      disabled={loading}
      className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-gray-100"
    >
      {loading ? 'Scanning…' : 'Scan now'}
    </button>
  );
}
