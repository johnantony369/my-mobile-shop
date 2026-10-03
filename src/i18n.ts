import { Language } from './types';

export const translations = {
  app_name: {
    en: 'My Mobile Shop',
  },
  // Tab Bar
  tab_book: {
    en: 'Day Book',
  },
  tab_stock: {
    en: 'Stock',
  },
  tab_reports: {
    en: 'Reports',
  },
  tab_settings: {
    en: 'Settings',
  },

  // Onboarding
  onboarding_welcome: {
    en: 'Welcome',
  },
  onboarding_subtitle: {
    en: 'Track your daily shop sales and expenses with zero hassle',
  },
  onboarding_shop_name_label: {
    en: 'Shop Name',
  },
  onboarding_shop_name_placeholder: {
    en: 'e.g. City Mobiles',
  },
  onboarding_language_label: {
    en: 'Select Language',
  },
  onboarding_start_button: {
    en: 'Get Started',
  },
  onboarding_shop_name_required: {
    en: 'Please enter shop name',
  },

  // Book Tab
  today: {
    en: 'Today',
  },
  yesterday: {
    en: 'Yesterday',
  },
  add_entry: {
    en: 'Add',
  },
  empty_today: {
    en: 'No entries today yet',
  },
  empty_today_hint: {
    en: 'Tap "+ Add" below to record your first entry',
  },
  empty_day: {
    en: 'No entries recorded for this date',
  },
  empty_day_hint: {
    en: 'Use the button below to add an entry for this day',
  },
  summary_in: {
    en: 'In',
  },
  summary_out: {
    en: 'Out',
  },
  summary_net: {
    en: 'Net',
  },
  cash: {
    en: 'Cash',
  },
  upi: {
    en: 'UPI',
  },
  card: {
    en: 'Card',
  },
  fallback_sale: {
    en: 'Sale',
  },
  fallback_expense: {
    en: 'Expense',
  },
  yesterday_summary_title: {
    en: "Yesterday's Summary",
  },
  yesterday_no_entries: {
    en: 'No entries were recorded yesterday',
  },
  share_btn: {
    en: 'Share',
  },
  dismiss_btn: {
    en: 'Dismiss',
  },
  delete_title: {
    en: 'Delete Entry?',
  },
  delete_message: {
    en: 'This entry will be permanently deleted. Are you sure?',
  },
  delete_action: {
    en: 'Delete',
  },
  cancel_action: {
    en: 'Cancel',
  },
  edit_action: {
    en: 'Edit',
  },

  // Add / Edit Sheet
  new_entry_title: {
    en: 'New Entry',
  },
  edit_entry_title: {
    en: 'Edit Entry',
  },
  amount_label: {
    en: 'Amount',
  },
  type_in_label: {
    en: 'In (Sale)',
  },
  type_out_label: {
    en: 'Out (Expense)',
  },
  payment_method_label: {
    en: 'Payment Method',
  },
  item_label: {
    en: 'Item / Service',
  },
  item_placeholder: {
    en: 'e.g. Screen Guard, Recharge, Back Cover',
  },
  customer_label: {
    en: 'Customer Name (Optional)',
  },
  customer_placeholder: {
    en: 'Enter customer name',
  },
  note_label: {
    en: 'Note (Optional)',
  },
  note_placeholder: {
    en: 'Any details',
  },
  date_label: {
    en: 'Date',
  },
  save_btn: {
    en: 'Confirm & Save Entry',
  },
  update_btn: {
    en: 'Confirm & Update Entry',
  },
  amount_error: {
    en: 'Enter a valid amount (₹1 to ₹99,99,999)',
  },
  read_only_locked_msg: {
    en: 'Trial expired. New entries are locked. Enter activation code in Settings.',
  },

  // Reports
  reports_header: {
    en: 'Reports',
  },
  total_in: {
    en: 'Total In',
  },
  total_out: {
    en: 'Total Out',
  },
  net_profit: {
    en: 'Net Balance',
  },
  entries_count: {
    en: 'Entries',
  },
  payment_breakdown_title: {
    en: 'Income Breakdown',
  },
  daily_sales_chart_title: {
    en: 'Daily Sales Chart',
  },
  no_chart_data: {
    en: 'No data for this month',
  },
  share_month_summary: {
    en: 'Share Summary',
  },
  export_csv_btn: {
    en: 'Export CSV',
  },
  items_unit: {
    en: 'items',
  },

  // Settings
  settings_header: {
    en: 'Settings',
  },
  section_shop_info: {
    en: 'Shop Info',
  },
  save_changes: {
    en: 'Save Changes',
  },
  shop_name_saved: {
    en: 'Shop name updated',
  },
  section_language: {
    en: 'Language',
  },
  lang_malayalam: {
    en: 'Malayalam',
  },
  lang_english: {
    en: 'English',
  },
  section_activation: {
    en: 'App Activation',
  },
  activated_status: {
    en: 'Activated (Lifetime Access)',
  },
  trial_day_remaining: {
    en: 'Free Trial: 1 day remaining',
  },
  trial_days_remaining: {
    en: 'Free Trial: {days} days remaining',
  },
  trial_expired: {
    en: 'Trial Expired (Read-Only Mode)',
  },
  trial_expired_banner: {
    en: 'Trial expired. New entries are locked until activated. All existing data remains safe.',
  },
  activation_code_placeholder: {
    en: 'XXXX-XXXX-XXXX-XXXX',
  },
  activate_btn: {
    en: 'Activate Now',
  },
  invalid_code_error: {
    en: 'Invalid activation code. Please check and try again.',
  },
  activated_success_msg: {
    en: 'App successfully activated!',
  },
  // Paywall & Upgrade
  pro_badge: {
    en: 'PRO',
  },
  upgrade_to_pro: {
    en: 'Upgrade to Lifetime Pro',
  },
  upgrade_button: {
    en: 'Upgrade to Pro',
  },
  paywall_title: {
    en: 'Unlock My Mobile Shop Pro',
  },
  paywall_subtitle: {
    en: 'One-time payment, lifetime unlimited access',
  },
  paywall_tagline: {
    en: 'No monthly subscriptions • Lifetime Validity',
  },
  paywall_feature_1: {
    en: 'Unlimited daily transactions, sales & expenses',
  },
  paywall_feature_2: {
    en: 'Automatic cloud backup & multi-device sync',
  },
  paywall_feature_3: {
    en: 'Complete mobile service & repair management module',
  },
  paywall_feature_4: {
    en: 'Monthly sales analytics & one-click Excel / CSV export',
  },
  paywall_feature_5: {
    en: '100% offline-first + all future app updates included',
  },
  paywall_feature_6: {
    en: 'Fast, secure & private — your shop data stays yours',
  },
  paywall_pricing_badge: {
    en: 'Special Offer • One-Time Payment',
  },
  paywall_cta: {
    en: 'Get Lifetime Access',
  },
  paywall_secure_note: {
    en: '100% Secure via Razorpay (UPI, GPay, PhonePe, Cards)',
  },
  paywall_have_code: {
    en: 'Already paid? Enter Activation Code',
  },
  paywall_enter_code: {
    en: 'Enter Activation Code',
  },
  paywall_verify_btn: {
    en: 'Verify & Activate',
  },
  paywall_close: {
    en: 'Maybe Later',
  },
  pro_member_badge: {
    en: 'Lifetime Pro Member',
  },
  pro_active_desc: {
    en: 'All premium features and lifetime updates unlocked.',
  },
  section_backup: {
    en: 'Data Backup & Restore',
  },
  backup_export_btn: {
    en: 'Export Full Backup (JSON)',
  },
  backup_import_btn: {
    en: 'Restore Backup from File',
  },
  last_backup_label: {
    en: 'Last Backup:',
  },
  never_backed_up: {
    en: 'Never',
  },
  backup_warning_30days: {
    en: 'Notice: No backup taken in over 30 days! Please download a backup to prevent data loss.',
  },
  backup_export_success: {
    en: 'Backup downloaded successfully',
  },
  backup_import_confirm: {
    en: 'This will import entries from the backup file into your app. Continue?',
  },
  backup_import_success: {
    en: 'Data restored successfully!',
  },
  backup_import_error: {
    en: 'Failed to read file or invalid backup format.',
  },
  section_about: {
    en: 'About',
  },
  app_version_label: {
    en: 'Version',
  },
  offline_notice: {
    en: '100% Offline • No Internet Required',
  },

  // Developer / Demo
  dev_section: {
    en: 'Demo Data (Testing)',
  },
  dev_seed_btn: {
    en: 'Insert ~30 Sample Entries',
  },
  dev_seed_success: {
    en: 'Demo entries inserted successfully',
  },
  dev_clear_btn: {
    en: 'Clear All Entries',
  },
  dev_clear_confirm: {
    en: 'Are you sure you want to delete all entries?',
  },
  dev_clear_success: {
    en: 'All entries cleared',
  },

  // Repairs Module
  tab_repairs: {
    en: 'Repairs',
  },
  new_job_btn: {
    en: 'New Job',
  },
  status_received: {
    en: 'Received',
  },
  status_waiting: {
    en: 'Waiting for Parts',
  },
  status_ready: {
    en: 'Ready',
  },
  status_delivered: {
    en: 'Delivered',
  },
  status_returned: {
    en: 'Returned',
  },
  segment_active: {
    en: 'Active',
  },
  segment_ready: {
    en: 'Ready',
  },
  segment_history: {
    en: 'History',
  },
  field_customer_name: {
    en: 'Customer Name',
  },
  field_phone: {
    en: 'Phone Number',
  },
  field_model: {
    en: 'Model',
  },
  field_complaint: {
    en: 'Complaint',
  },
  field_estimate: {
    en: 'Estimated Amount',
  },
  field_advance: {
    en: 'Advance Paid',
  },
  field_balance: {
    en: 'Balance Due',
  },
  field_final_amount: {
    en: 'Final Amount',
  },
  field_expected_date: {
    en: 'Ready By Date',
  },
  field_imei: {
    en: 'IMEI (Optional)',
  },
  notify_customer: {
    en: 'Notify Customer',
  },
  copy_message: {
    en: 'Copy Message',
  },
  add_to_book_checkbox: {
    en: "Add to today's Book",
  },
  empty_active_jobs: {
    en: 'No active jobs',
  },
  empty_ready_jobs: {
    en: 'No ready jobs',
  },
  empty_history_jobs: {
    en: 'History is empty',
  },
  invalid_phone_error: {
    en: 'Enter a valid 10-digit phone number',
  },
  days_in_shop: {
    en: '{n} days',
  },
  search_jobs_placeholder: {
    en: 'Search name, phone, model',
  },
  onboarding_repairs_question: {
    en: 'Do you offer phone repairs?',
  },
  onboarding_repairs_yes: {
    en: 'Yes',
  },
  onboarding_repairs_no: {
    en: 'No',
  },
  section_repairs: {
    en: 'Repairs Service',
  },
  enable_repairs: {
    en: 'Enable Repairs Module',
  },
  enable_repairs_desc: {
    en: 'Track phone servicing, ready alerts, and deliveries',
  },
  repair_badge: {
    en: 'Repair',
  },
  stat_repairs_delivered: {
    en: 'Repairs Delivered',
  },
  stat_repairs_delivered_desc: {
    en: 'Completed this month',
  },
  call_btn: {
    en: 'Call',
  },
  whatsapp_btn: {
    en: 'WhatsApp',
  },
  message_copied_toast: {
    en: 'Message copied to clipboard!',
  },
  advance_status_action: {
    en: 'Advance to: {next}',
  },
  other_status_action: {
    en: 'Other Status',
  },
  mark_delivered_action: {
    en: 'Mark as Delivered',
  },
  return_without_repair_action: {
    en: 'Return without repair',
  },
  return_confirm_title: {
    en: 'Return without repair?',
  },
  return_confirm_message: {
    en: 'This job will be marked as returned without any charge.',
  },
  delete_job_title: {
    en: 'Delete Repair Job?',
  },
  delete_job_message: {
    en: 'This repair job will be permanently deleted. Are you sure?',
  },
  delivery_sheet_title: {
    en: 'Phone Delivery',
  },
  delivery_confirm_btn: {
    en: 'Confirm Delivery',
  },
  negative_balance_warning: {
    en: 'Notice: Advance exceeds the final amount!',
  },
  ready_suggestion_title: {
    en: 'Phone is Ready!',
  },
  ready_suggestion_desc: {
    en: 'Notify customer on WhatsApp',
  },
  job_detail_title: {
    en: 'Job Details',
  },
  customer_section_title: {
    en: 'Customer',
  },
  device_section_title: {
    en: 'Device Details',
  },
  money_section_title: {
    en: 'Charges',
  },
  dates_section_title: {
    en: 'Dates',
  },
  received_date_label: {
    en: 'Received Date',
  },
  ready_date_label: {
    en: 'Ready Date',
  },
  delivered_date_label: {
    en: 'Delivered Date',
  },
  days_in_shop_label: {
    en: 'Time in Shop',
  },
  dev_seed_jobs_btn: {
    en: 'Insert ~10 Sample Repair Jobs',
  },
  dev_seed_jobs_success: {
    en: 'Sample repair jobs inserted successfully',
  },
  edit_job: {
    en: 'Edit Job',
  },
  save_job: {
    en: 'Save Job',
  },
  update_job: {
    en: 'Update Job',
  },

  // PWA Install & Updates
  section_app_updates: {
    en: 'App & Updates',
  },
  pwa_install_btn: {
    en: 'Install App to Home Screen',
  },
  pwa_installed_status: {
    en: 'Installed as App',
  },
  pwa_updates_note: {
    en: 'Updates install automatically in the background when you open the app',
  },
  pwa_check_update_btn: {
    en: 'Check for Updates',
  },
  pwa_up_to_date: {
    en: 'App is up to date',
  },
  pwa_updating: {
    en: 'Installing update…',
  },
};

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, _lang: Language = 'en', params?: Record<string, string | number>): string {
  const item = translations[key];
  if (!item) return key;
  let text = item.en || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

// Indian Rupee currency formatter
const inFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return `₹${inFormatter.format(amount || 0)}`;
}
