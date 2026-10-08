import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { TabType } from '../../components/TabBar';
import { WebSidebar } from './components/WebSidebar';
import { WebHeader } from './components/WebHeader';
import { WebBookView } from './views/WebBookView';
import { WebStockView } from './views/WebStockView';
import { WebRepairsView } from './views/WebRepairsView';
import { ToolsScreen } from '../ToolsScreen';
import { SettingsScreen } from '../SettingsScreen';
import { AddEditSheet } from '../AddEditSheet';
import { BillSheet } from '../BillSheet';
import { AddEditStockSheet } from '../AddEditStockSheet';
import { AddEditJobSheet } from '../AddEditJobSheet';
import { JobDetailSheet } from '../JobDetailSheet';
import { AddEditUsedPhoneSheet } from '../AddEditUsedPhoneSheet';
import { PaywallModal } from '../../components/PaywallModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Entry, Job, Language, AppSettings } from '../../types';
import { getLocalDateString } from '../../utils/date';
import { getTrialDaysRemaining } from '../../utils/activation';
import { isProCurrentlyActive } from '../../utils/proPlan';
import { hasFullAccess } from '../../utils/admin';
import { useAuth } from '../../firebase/useAuth';

export function WebApp() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Modals / Sheets State
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isBillOpen, setIsBillOpen] = useState(false);

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAddUsedOpen, setIsAddUsedOpen] = useState(false);

  const { user, syncState, triggerSync, signOut } = useAuth();

  // Settings Live Query
  const settingsList = useLiveQuery(async () => {
    try {
      await db.open();
      return await db.settings.toArray();
    } catch {
      return [];
    }
  }, []);

  const settings: AppSettings | undefined = settingsList && settingsList[0];
  const language: Language = 'en';
  const trialDays = settings ? getTrialDaysRemaining(settings.firstLaunchDate) : 0;
  const isActivated = settings ? hasFullAccess(isProCurrentlyActive(settings), user) : true;
  const isReadOnly = !isActivated && trialDays <= 0;

  // Day Book Entries Live Query for selected date
  const entries = useLiveQuery(async () => {
    try {
      const items = await db.entries.where('date').equals(selectedDate).toArray();
      const valid = items.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
      const seen = new Set<string>();
      const dedup: Entry[] = [];
      for (const item of valid) {
        if (item.cloudId) {
          if (seen.has(item.cloudId)) continue;
          seen.add(item.cloudId);
        }
        dedup.push(item);
      }
      return dedup.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  }, [selectedDate]) ?? [];

  // Stock Items Live Query
  const stock = useLiveQuery(async () => {
    try {
      if (!db.stock) return [];
      const items = await db.stock.toArray();
      return items.filter((s) => !s.deletedAt && s.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  // Pre-Owned Devices Live Query
  const usedDevices = useLiveQuery(async () => {
    try {
      if (!db.usedDevices) return [];
      const items = await db.usedDevices.toArray();
      return items.filter((d) => !d.deletedAt && d.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  // Jobs Live Query
  const jobs = useLiveQuery(async () => {
    try {
      if (!db.jobs) return [];
      const items = await db.jobs.toArray();
      return items.filter((j) => !j.deletedAt && j.syncStatus !== 'deleted').sort((a, b) => {
        const timeA = a.receivedAt || 0;
        const timeB = b.receivedAt || 0;
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  }, []) ?? [];

  // Badge calculations
  const readyCount = jobs.filter((j) => j.status === 'ready').length;
  const lowStockCount = stock.filter(
    (s) => s.category === 'product' && (s.quantity ?? 0) <= (s.lowStockThreshold || 5)
  ).length;
  const usedStockCount = usedDevices.filter((d) => d.status === 'in_stock').length;

  // Actions
  const handleSettleCredit = async (entry: Entry) => {
    if (entry.id) {
      await db.entries.update(entry.id, {
        paymentMethod: 'cash',
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
    }
  };

  const handleAdjustStockQty = async (id: number, delta: number) => {
    const item = await db.stock.get(id);
    if (!item) return;
    const newQty = Math.max(0, (item.quantity ?? 0) + delta);
    await db.stock.update(id, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-500/20">
      {/* Desktop Persistent Left Navigation */}
      <WebSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        language={language}
        settings={settings}
        isActivated={isActivated}
        trialDays={trialDays}
        showRepairs={settings?.showRepairs}
        showStock={settings?.showStock}
        readyCount={readyCount}
        lowStockCount={lowStockCount}
        usedStockCount={usedStockCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onSignOut={signOut}
        userEmail={user?.email}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <WebHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          syncState={syncState}
          onSyncClick={triggerSync}
          onAddSale={() => {
            setEntryToEdit(null);
            setIsAddEntryOpen(true);
          }}
          onAddExpense={() => {
            setEntryToEdit(null);
            setIsAddEntryOpen(true);
          }}
          onOpenBill={() => setIsBillOpen(true)}
          isReadOnly={isReadOnly}
        />

        {/* Viewport View */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-fade-slide-in">
          {currentTab === 'book' && (
            <WebBookView
              entries={entries}
              selectedDate={selectedDate}
              language={language}
              onEdit={(e) => {
                setEntryToEdit(e);
                setIsAddEntryOpen(true);
              }}
              onDelete={(e) => setEntryToDelete(e)}
              onSettleCredit={handleSettleCredit}
              onOpenAdd={() => {
                setEntryToEdit(null);
                setIsAddEntryOpen(true);
              }}
              isReadOnly={isReadOnly}
            />
          )}

          {currentTab === 'stock' && (
            <WebStockView
              stock={stock}
              usedDevices={usedDevices}
              language={language}
              onAdjustQty={handleAdjustStockQty}
              onOpenAddStock={() => setIsAddStockOpen(true)}
              onOpenAddUsed={() => setIsAddUsedOpen(true)}
              onSellUsed={async (d) => {
                if (d.id) {
                  await db.usedDevices.update(d.id, {
                    status: 'sold',
                    soldPrice: d.sellingPrice || d.purchasePrice,
                    soldDate: getLocalDateString(),
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'pending',
                  });
                }
              }}
              isReadOnly={isReadOnly}
            />
          )}

          {currentTab === 'repairs' && (
            <WebRepairsView
              jobs={jobs}
              language={language}
              onOpenAddJob={() => setIsAddJobOpen(true)}
              onSelectJob={(j) => setSelectedJob(j)}
              isReadOnly={isReadOnly}
            />
          )}

          {currentTab === 'tools' && (
            <div className="max-w-xl mx-auto">
              <ToolsScreen
                language={language}
                shopName={settings?.shopName || 'My Mobile Shop'}
                shopPhone={settings?.shopAddress}
                shopAddress={settings?.shopAddress}
                isReadOnly={isReadOnly}
                isActivated={isActivated}
                onOpenPaywall={() => setIsPaywallOpen(true)}
              />
            </div>
          )}

          {currentTab === 'settings' && settings && (
            <div className="max-w-xl mx-auto">
              <SettingsScreen
                settings={settings}
                language={language}
                onLanguageChange={() => {}}
                onRefreshSettings={() => {}}
                onOpenPaywall={() => setIsPaywallOpen(true)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Shared Modals and Action Sheets */}
      {isAddEntryOpen && (
        <AddEditSheet
          isOpen={isAddEntryOpen}
          onClose={() => {
            setIsAddEntryOpen(false);
            setEntryToEdit(null);
          }}
          onSaved={() => {
            setIsAddEntryOpen(false);
            setEntryToEdit(null);
          }}
          entryToEdit={entryToEdit}
          defaultDate={selectedDate}
          shopName={settings?.shopName}
          shopAddress={settings?.shopAddress}
          language={language}
          isReadOnly={isReadOnly}
        />
      )}

      {isBillOpen && (
        <BillSheet
          isOpen={isBillOpen}
          onClose={() => setIsBillOpen(false)}
          defaultDate={selectedDate}
          language={language}
          shopName={settings?.shopName || 'My Mobile Shop'}
          shopAddress={settings?.shopAddress}
        />
      )}

      {isAddStockOpen && (
        <AddEditStockSheet
          isOpen={isAddStockOpen}
          onClose={() => setIsAddStockOpen(false)}
          onSaved={() => setIsAddStockOpen(false)}
          itemToEdit={null}
          language={language}
        />
      )}

      {isAddJobOpen && (
        <AddEditJobSheet
          isOpen={isAddJobOpen}
          onClose={() => setIsAddJobOpen(false)}
          onSaved={() => setIsAddJobOpen(false)}
          jobToEdit={null}
          language={language}
          shopName={settings?.shopName}
        />
      )}

      {selectedJob && (
        <JobDetailSheet
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          shopName={settings?.shopName || 'My Mobile Shop'}
          language={language}
          onEdit={() => {}}
          onDelete={async (job) => {
            if (job.id) {
              await db.jobs.update(job.id, {
                syncStatus: 'deleted',
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setSelectedJob(null);
            }
          }}
          onOpenDelivery={() => setSelectedJob(null)}
          onJobUpdated={() => {}}
        />
      )}

      {isAddUsedOpen && (
        <AddEditUsedPhoneSheet
          isOpen={isAddUsedOpen}
          onClose={() => setIsAddUsedOpen(false)}
          shopName={settings?.shopName || 'My Mobile Shop'}
        />
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <ConfirmModal
          isOpen={!!entryToDelete}
          title="Delete Transaction"
          message="Are you sure you want to delete this Day Book transaction? This will mark it deleted across your synced devices."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDestructive
          onConfirm={async () => {
            if (entryToDelete && entryToDelete.id) {
              await db.entries.update(entryToDelete.id, {
                syncStatus: 'deleted',
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setEntryToDelete(null);
            }
          }}
          onCancel={() => setEntryToDelete(null)}
        />
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        language={language}
        trialDaysRemaining={trialDays}
      />
    </div>
  );
}
