import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { TabBar, MainTab } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { AppointmentsScreen } from './screens/AppointmentsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { MoreScreen } from './screens/MoreScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AppointmentSheet } from './screens/AppointmentSheet';
import { CustomerSheet } from './screens/CustomerSheet';
import { ServiceSheet } from './screens/ServiceSheet';
import { StaffSheet } from './screens/StaffSheet';
import { SalonBillSheet } from './screens/SalonBillSheet';
import { PaywallModal } from './components/PaywallModal';
import { InstallBanner } from './components/InstallBanner';
import { Appointment, Customer, SalonService, StaffMember } from './types';
import { requestPersistentStorage } from './utils/storage';
import { useAuth } from './firebase/useAuth';
import { getLocalDateString } from './utils/date';
import { isProCurrentlyActive } from './utils/proPlan';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Bottom Sheets State
  const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [appointmentDefaultCustomer, setAppointmentDefaultCustomer] = useState<Customer | null>(null);

  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isServiceSheetOpen, setIsServiceSheetOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<SalonService | null>(null);

  const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const [isBillSheetOpen, setIsBillSheetOpen] = useState(false);
  const [billDefaultAppointment, setBillDefaultAppointment] = useState<Appointment | null>(null);
  const [billDefaultCustomer, setBillDefaultCustomer] = useState<Customer | null>(null);

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    requestPersistentStorage();
  }, []);

  // Safe live query for settings
  const settingsList = useLiveQuery(
    async () => {
      try {
        await db.open();
        return await db.settings.toArray();
      } catch (err) {
        console.error('Error reading settings from IndexedDB:', err);
        return [];
      }
    },
    [refreshTrigger]
  );

  // Today's appointments count for tab badge
  const todayStr = getLocalDateString();
  const todayAppointmentsCount = useLiveQuery(
    async () => {
      try {
        return await db.appointments.where('date').equals(todayStr).count();
      } catch {
        return 0;
      }
    },
    [todayStr, refreshTrigger]
  ) ?? 0;

  // Loading state
  if (settingsList === undefined || authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F5F3] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#8E8E93]">Opening MySalon...</span>
      </div>
    );
  }

  // First launch / no settings: show Onboarding
  if (settingsList.length === 0) {
    return (
      <OnboardingScreen
        onComplete={() => setRefreshTrigger((prev) => prev + 1)}
      />
    );
  }

  const settings = settingsList[0];
  const isProActive = isProCurrentlyActive(settings);
  void isProActive;

  return (
    <div className="min-h-screen bg-[#F6F5F3] text-[#171717] font-sans flex flex-col justify-between selection:bg-[#171717]/10">
      {/* Active Tab Screen */}
      <main key={currentTab} className="flex-1 w-full max-w-lg mx-auto animate-fade-slide-in">
        {currentTab === 'home' && (
          <HomeScreen
            shopName={settings.shopName}
            ownerName={settings.ownerName}
            onNewAppointment={() => {
              setAppointmentToEdit(null);
              setAppointmentDefaultCustomer(null);
              setIsAppointmentSheetOpen(true);
            }}
            onNewBill={(appt) => {
              setBillDefaultAppointment(appt || null);
              setBillDefaultCustomer(null);
              setIsBillSheetOpen(true);
            }}
            onSelectAppointment={(appt) => {
              setAppointmentToEdit(appt);
              setIsAppointmentSheetOpen(true);
            }}
            onGoToAppointments={() => setCurrentTab('appointments')}
          />
        )}

        {currentTab === 'appointments' && (
          <AppointmentsScreen
            onNewAppointment={() => {
              setAppointmentToEdit(null);
              setAppointmentDefaultCustomer(null);
              setIsAppointmentSheetOpen(true);
            }}
            onEditAppointment={(appt) => {
              setAppointmentToEdit(appt);
              setIsAppointmentSheetOpen(true);
            }}
            onOpenBillForAppointment={(appt) => {
              setBillDefaultAppointment(appt);
              setBillDefaultCustomer(null);
              setIsBillSheetOpen(true);
            }}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersScreen
            onAddCustomer={() => {
              setCustomerToEdit(null);
              setIsCustomerSheetOpen(true);
            }}
            onEditCustomer={(c) => {
              setCustomerToEdit(c);
              setIsCustomerSheetOpen(true);
            }}
            onNewAppointmentForCustomer={(c) => {
              setAppointmentToEdit(null);
              setAppointmentDefaultCustomer(c);
              setIsAppointmentSheetOpen(true);
            }}
            onNewBillForCustomer={(c) => {
              setBillDefaultCustomer(c);
              setBillDefaultAppointment(null);
              setIsBillSheetOpen(true);
            }}
          />
        )}

        {currentTab === 'more' && (
          <MoreScreen
            settings={settings}
            onRefreshSettings={() => setRefreshTrigger((prev) => prev + 1)}
            onOpenPaywall={() => setIsPaywallOpen(true)}
            onAddService={() => {
              setServiceToEdit(null);
              setIsServiceSheetOpen(true);
            }}
            onEditService={(s) => {
              setServiceToEdit(s);
              setIsServiceSheetOpen(true);
            }}
            onAddStaff={() => {
              setStaffToEdit(null);
              setIsStaffSheetOpen(true);
            }}
            onEditStaff={(st) => {
              setStaffToEdit(st);
              setIsStaffSheetOpen(true);
            }}
          />
        )}
      </main>

      {/* Persistent Bottom Tab Bar */}
      <TabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        todayAppointmentsCount={todayAppointmentsCount}
      />

      {/* Install Banner */}
      <InstallBanner language="en" />

      {/* Reusable Bottom Sheets */}
      <AppointmentSheet
        isOpen={isAppointmentSheetOpen}
        onClose={() => setIsAppointmentSheetOpen(false)}
        appointmentToEdit={appointmentToEdit}
        defaultCustomer={appointmentDefaultCustomer}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <CustomerSheet
        isOpen={isCustomerSheetOpen}
        onClose={() => setIsCustomerSheetOpen(false)}
        customerToEdit={customerToEdit}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ServiceSheet
        isOpen={isServiceSheetOpen}
        onClose={() => setIsServiceSheetOpen(false)}
        serviceToEdit={serviceToEdit}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <StaffSheet
        isOpen={isStaffSheetOpen}
        onClose={() => setIsStaffSheetOpen(false)}
        staffToEdit={staffToEdit}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <SalonBillSheet
        isOpen={isBillSheetOpen}
        onClose={() => setIsBillSheetOpen(false)}
        shopName={settings.shopName}
        defaultAppointment={billDefaultAppointment}
        defaultCustomer={billDefaultCustomer}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onActivated={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
