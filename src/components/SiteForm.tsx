'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SiteFormValues {
  name: string;
  url: string;
  cronSchedule: string;
  alertThreshold: number;
  alertEmail: string;
}

interface SiteFormProps {
  initialValues?: Partial<SiteFormValues>;
  siteId?: string;
  onSuccess?: () => void;
}

const CRON_PRESETS = [
  { label: 'Every day at 2am', value: '0 2 * * *' },
  { label: 'Every week (Sunday 2am)', value: '0 2 * * 0' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Custom', value: 'custom' },
];

export default function SiteForm({ initialValues, siteId, onSuccess }: SiteFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? '');
  const [url, setUrl] = useState(initialValues?.url ?? '');
  const [alertThreshold, setAlertThreshold] = useState(
    initialValues?.alertThreshold?.toString() ?? '10'
  );
  const [alertEmail, setAlertEmail] = useState(initialValues?.alertEmail ?? '');
  const [cronPreset, setCronPreset] = useState(() => {
    const initial = initialValues?.cronSchedule ?? '0 2 * * *';
    const preset = CRON_PRESETS.find((p) => p.value === initial);
    return preset ? initial : 'custom';
  });
  const [customCron, setCustomCron] = useState(initialValues?.cronSchedule ?? '0 2 * * *');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveCron = cronPreset === 'custom' ? customCron : cronPreset;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: SiteFormValues = {
        name,
        url,
        cronSchedule: effectiveCron,
        alertThreshold: Number(alertThreshold),
        alertEmail,
      };

      const method = siteId ? 'PATCH' : 'POST';
      const endpoint = siteId ? `/api/sites/${siteId}` : '/api/sites';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save site');
      }

      const site = await res.json();
      onSuccess?.();
      router.push(`/sites/${site.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Site name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Production App"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          id="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="cron-preset" className="block text-sm font-medium text-gray-700 mb-1">
          Scan schedule
        </label>
        <select
          id="cron-preset"
          value={cronPreset}
          onChange={(e) => setCronPreset(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CRON_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {cronPreset === 'custom' && (
          <input
            type="text"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="0 2 * * *"
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>

      <div>
        <label htmlFor="alert-threshold" className="block text-sm font-medium text-gray-700 mb-1">
          Alert threshold (violations)
        </label>
        <input
          id="alert-threshold"
          type="number"
          min={0}
          value={alertThreshold}
          onChange={(e) => setAlertThreshold(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-400">
          Send email alert when violation count reaches this number
        </p>
      </div>

      <div>
        <label htmlFor="alert-email" className="block text-sm font-medium text-gray-700 mb-1">
          Alert email
        </label>
        <input
          id="alert-email"
          type="email"
          value={alertEmail}
          onChange={(e) => setAlertEmail(e.target.value)}
          placeholder="alerts@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : siteId ? 'Save changes' : 'Add site'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
