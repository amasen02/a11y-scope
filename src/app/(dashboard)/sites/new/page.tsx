import SiteForm from '@/components/SiteForm';

export default function NewSitePage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add new site</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SiteForm />
      </div>
    </div>
  );
}
