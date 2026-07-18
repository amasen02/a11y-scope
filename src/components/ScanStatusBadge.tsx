type ScanStatus = 'pending' | 'running' | 'done' | 'failed';

const statusConfig: Record<ScanStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-700',
  },
  done: {
    label: 'Done',
    className: 'bg-green-100 text-green-700',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
};

export function ScanStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ScanStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
