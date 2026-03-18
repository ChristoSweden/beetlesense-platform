import { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';

type Tab = 'notifications' | 'preferences';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('notifications');

  return (
    <div className="min-h-screen" style={{ background: '#030d05' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Page tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-emerald-950/40 border border-emerald-800/20 w-fit">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-emerald-100/40 hover:text-emerald-100/60'
            }`}
          >
            <Bell size={15} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-emerald-100/40 hover:text-emerald-100/60'
            }`}
          >
            <Settings size={15} />
            Preferences
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'notifications' ? (
          <NotificationCenter />
        ) : (
          <NotificationPreferences />
        )}
      </div>
    </div>
  );
}
