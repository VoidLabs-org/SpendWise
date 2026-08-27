import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DateFormatPref, setDateFormatPreference } from '@/utils/dateFormat';
import { parseTransactionsCsv } from '@/utils/csv';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

import { ThemeType, DARK, LIGHT } from '@/constants/theme';
import { INITIAL_STORE, StoreType, Transaction, Budget, Vehicle } from '@/constants/Store';
import { AppTabBar } from '@/components/SharedComponents';
import { SearchModal, SearchItem } from '@/components/SearchModal';
import { IcHome, IcList, IcCar, IcChart, IcGear, IcGauge, IcPlus } from '@/components/Icons';
import * as authApi from '@/services/api/authApi';
import * as vehicleApi from '@/services/api/vehicleApi';
import * as financeApi from '@/services/api/financeApi';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/services/auth/tokenStorage';

// Screen imports
import { SplashView, Onboarding } from '@/screens/Onboarding';
import { AuthScreen } from '@/screens/AuthScreen';
import { ScreenHome } from '@/screens/ScreenHome';
import { ScreenTransactions } from '@/screens/ScreenTransactions';
import { ScreenVehicles } from '@/screens/ScreenVehicles';
import { ScreenVehicleDetail } from '@/screens/ScreenVehicleDetail';
import { ScreenReports } from '@/screens/ScreenReports';
import { ScreenMore } from '@/screens/ScreenMore';
import { ScreenBudgets } from '@/screens/ScreenBudgets';
import { ScreenCategories } from '@/screens/ScreenCategories';
import { ScreenRecurring } from '@/screens/ScreenRecurring';
import { ScreenTxnDetail } from '@/screens/ScreenTxnDetail';
import {
  AddTransactionSheet,
  AddTransactionResult,
  AddFuelSheet,
  AddVehicleSheet,
  AddMaintenanceSheet,
  AddExpenseSheet,
  AddReminderSheet,
  AddBudgetSheet,
  AddCategorySheet,
  EditProfileSheet,
  OptionPickerSheet,
} from '@/screens/Sheets';
import { VehicleInput, MaintenanceLogInput, ExpenseInput, ReminderInput } from '@/services/api/vehicleApi';

export default function SpendWiseApp() {
  // 1. Load Custom Fonts
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  // 2. Local State for Settings and Database
  const [booted, setBooted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>('dark');
  const systemScheme = useColorScheme();
  const [tab, setTab] = useState('home');
  const [detail, setDetail] = useState<string | null>(null); // vehicle id
  const [pushed, setPushed] = useState<
    | { kind: 'budgets' }
    | { kind: 'categories' }
    | { kind: 'recurring' }
    | { kind: 'txn'; tx: Transaction }
    | null
  >(null);
  const [sheet, setSheet] = useState<
    | 'txn'
    | 'fuel'
    | 'vehicle'
    | 'maintenance'
    | 'expense'
    | 'reminder'
    | 'budget'
    | 'category'
    | 'editProfile'
    | 'currency'
    | 'language'
    | 'theme'
    | 'dateFormat'
    | null
  >(null);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Database states
  const [txns, setTxns] = useState<Transaction[]>(INITIAL_STORE.transactions);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_STORE.vehicles);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_STORE.budgets);
  const [trend, setTrend] = useState<{ m: string; v: number }[]>(INITIAL_STORE.trend);
  const [vehicleBreakdown, setVehicleBreakdown] = useState<{ label: string; v: number; color: string }[]>(
    INITIAL_STORE.vehicleBreakdown
  );
  const [financeCategories, setFinanceCategories] = useState<financeApi.BackendCategory[]>([]);
  const [recurring, setRecurring] = useState<financeApi.BackendRecurringTransaction[]>([]);
  const [userProfile, setUserProfile] = useState({ name: INITIAL_STORE.user, currency: 'LKR', photoUri: '' });
  // Auth-service's own record of who's logged in — not user-editable, refreshed each session
  // (register/login only return tokens, so this is fetched separately via /auth/validate).
  const [userEmail, setUserEmail] = useState('');
  // The name typed at registration, carried over as Onboarding's starting point (still
  // editable there) so it isn't silently lost or replaced by a placeholder default.
  const [pendingName, setPendingName] = useState('');
  const [language, setLanguage] = useState('English');
  const [dateFormat, setDateFormat] = useState<DateFormatPref>('DD/MM/YYYY');
  // Default rollover applied to newly-created budgets — a per-user preference, not a per-budget
  // one (each budget's own rollover can still be set independently at creation time).
  const [defaultRollover, setDefaultRollover] = useState(false);

  // 3. Load persisted settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const storedOnboard = await AsyncStorage.getItem('sw_onboarded');
        const storedTheme = await AsyncStorage.getItem('sw_theme');
        const storedTab = await AsyncStorage.getItem('sw_tab');
        const storedProfile = await AsyncStorage.getItem('sw_profile');
        const storedDefaultRollover = await AsyncStorage.getItem('sw_default_rollover');
        const storedLanguage = await AsyncStorage.getItem('sw_language');
        const storedDateFormat = await AsyncStorage.getItem('sw_date_format');

        // A stored refresh token means "was logged in" — exchange it for a fresh
        // access token so the session survives an app restart without re-entering credentials.
        const storedRefreshToken = await getRefreshToken();
        if (storedRefreshToken) {
          try {
            const tokens = await authApi.refresh(storedRefreshToken);
            await saveTokens(tokens.access_token, tokens.refresh_token);
            setAuthed(true);
            const identity = await authApi.validate(tokens.access_token);
            setUserEmail(identity.email);
          } catch {
            await clearTokens();
          }
        }

        if (storedOnboard === '1') setOnboarded(true);
        if (storedTheme) setThemeMode(storedTheme as 'dark' | 'light' | 'system');
        if (storedTab) setTab(storedTab);
        if (storedProfile) setUserProfile(JSON.parse(storedProfile));
        if (storedDefaultRollover === '1') setDefaultRollover(true);
        if (storedLanguage) setLanguage(storedLanguage);
        if (storedDateFormat) {
          const pref = storedDateFormat as DateFormatPref;
          setDateFormat(pref);
          setDateFormatPreference(pref);
        }
      } catch (err) {
        console.error('Failed to load local storage:', err);
      } finally {
        // Delay boot splash slightly like the HTML version
        setTimeout(() => setBooted(true), 1500);
      }
    }
    loadSettings();
  }, []);

  const loadVehicles = async () => {
    setVehiclesLoading(true);
    try {
      setVehicles(await vehicleApi.listVehiclesWithDetail());
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  // Vehicles live in vehicle-service, not local storage — fetch them once we have a
  // session (both on boot, when a stored refresh token restores it, and right after login).
  useEffect(() => {
    if (authed) loadVehicles();
  }, [authed]);

  // Transactions and budgets live in finance-service — same pattern as vehicles above.
  const loadFinance = async () => {
    try {
      const [freshTxns, freshBudgets, freshTrend, freshVehicleBreakdown, freshCategories, freshRecurring] = await Promise.all([
        financeApi.listTransactionsMapped(),
        financeApi.listBudgetsMapped(),
        financeApi.getTrendMapped(),
        financeApi.getVehicleBreakdownMapped(),
        financeApi.listCategories(true),
        financeApi.listRecurring(),
      ]);
      setTxns(freshTxns);
      setBudgets(freshBudgets);
      setTrend(freshTrend);
      setVehicleBreakdown(freshVehicleBreakdown);
      setFinanceCategories(freshCategories);
      setRecurring(freshRecurring);
    } catch (err) {
      console.error('Failed to load transactions/budgets:', err);
    }
  };

  useEffect(() => {
    if (authed) loadFinance();
  }, [authed]);

  const selectThemeMode = async (mode: 'dark' | 'light' | 'system') => {
    setThemeMode(mode);
    await AsyncStorage.setItem('sw_theme', mode);
  };

  const toggleDefaultRollover = async () => {
    const next = !defaultRollover;
    setDefaultRollover(next);
    await AsyncStorage.setItem('sw_default_rollover', next ? '1' : '0');
  };

  const finishOnboarding = async (name: string, currency: string) => {
    const profile = { name, currency, photoUri: '' };
    setUserProfile(profile);
    setOnboarded(true);
    await AsyncStorage.setItem('sw_onboarded', '1');
    await AsyncStorage.setItem('sw_profile', JSON.stringify(profile));
  };

  const saveProfile = async (input: { name: string; photoUri: string }) => {
    const profile = { ...userProfile, name: input.name, photoUri: input.photoUri };
    setUserProfile(profile);
    await AsyncStorage.setItem('sw_profile', JSON.stringify(profile));
  };

  const selectCurrency = async (currency: string) => {
    const profile = { ...userProfile, currency };
    setUserProfile(profile);
    await AsyncStorage.setItem('sw_profile', JSON.stringify(profile));
  };

  const selectLanguage = async (lang: string) => {
    setLanguage(lang);
    await AsyncStorage.setItem('sw_language', lang);
  };

  const selectDateFormat = async (pref: DateFormatPref) => {
    setDateFormat(pref);
    setDateFormatPreference(pref);
    await AsyncStorage.setItem('sw_date_format', pref);
    // Transaction/vehicle display strings are formatted once at fetch time, not at render
    // time, so already-loaded data needs a re-fetch to pick up the new preference immediately.
    await Promise.all([loadFinance(), loadVehicles()]);
  };

  const doAuth = async (registeredName?: string) => {
    // AuthScreen already performed the login/register call and stored tokens itself.
    setAuthed(true);
    if (registeredName) setPendingName(registeredName);
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        const identity = await authApi.validate(accessToken);
        setUserEmail(identity.email);
      }
    } catch (err) {
      console.error('Failed to fetch account email:', err);
    }
  };

  const logOut = async () => {
    const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
    if (accessToken && refreshToken) {
      try {
        await authApi.logout(accessToken, refreshToken);
      } catch (err) {
        console.error('Failed to revoke session on logout:', err);
      }
    }
    await clearTokens();
    setAuthed(false);
    setUserEmail('');
  };

  // 5. Database Modification Handlers
  const handleAddTxn = async (tx: AddTransactionResult) => {
    try {
      if (tx.repeat === 'none') {
        await financeApi.createTransaction({
          amount: tx.amount,
          category: tx.cat,
          note: tx.note,
          photo_url: tx.photoUrl,
        });
      } else {
        // The backend creates the first occurrence immediately as part of Create, so this
        // single call both starts the recurring template and records today's transaction.
        await financeApi.createRecurring({
          amount: tx.amount,
          category: tx.cat,
          note: tx.note,
          photo_url: tx.photoUrl,
          frequency: tx.repeat,
        });
      }
      await loadFinance();
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const handleUpdateTxn = async (t: Transaction) => {
    try {
      await financeApi.updateTransaction(t.id, {
        amount: t.amount,
        category: t.cat,
        note: t.note,
        photo_url: t.photoUrl,
      });
      await loadFinance();
    } catch (err) {
      console.error('Failed to update transaction:', err);
    }
  };

  const handleDeleteTxn = async (id: string) => {
    try {
      await financeApi.deleteTransaction(id);
      setTxns((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleAddFuel = async (entry: { litres: number; cost: number; odo: number; station?: string }) => {
    if (!detail) return;
    try {
      await vehicleApi.createFuelLog(detail, {
        litres: entry.litres,
        cost: entry.cost,
        odometer: entry.odo,
        station: entry.station,
      });
      const updated = await vehicleApi.getVehicleDetail(detail);
      setVehicles((prev) => prev.map((v) => (v.id === detail ? updated : v)));

      // finance-service auto-imports this as a "Transport" transaction via RabbitMQ
      // (vehicle.expense.created) — no manual entry needed here. It may take a moment to
      // land, so a fresh load a beat later is more likely to catch it than an immediate one.
      setTimeout(loadFinance, 1500);
    } catch (err) {
      console.error('Failed to log fuel fill-up:', err);
    }
  };

  const handleSaveVehicle = async (input: VehicleInput) => {
    try {
      if (editingVehicle && detail) {
        await vehicleApi.updateVehicle(detail, input);
      } else {
        await vehicleApi.createVehicle(input);
      }
      await loadVehicles();
    } catch (err) {
      console.error('Failed to save vehicle:', err);
    }
  };

  const handleAddMaintenance = async (input: MaintenanceLogInput) => {
    if (!detail) return;
    try {
      await vehicleApi.createMaintenanceLog(detail, input);
      const updated = await vehicleApi.getVehicleDetail(detail);
      setVehicles((prev) => prev.map((v) => (v.id === detail ? updated : v)));
    } catch (err) {
      console.error('Failed to log maintenance:', err);
    }
  };

  const handleAddExpense = async (input: ExpenseInput) => {
    if (!detail) return;
    try {
      await vehicleApi.createExpense(detail, input);
      const updated = await vehicleApi.getVehicleDetail(detail);
      setVehicles((prev) => prev.map((v) => (v.id === detail ? updated : v)));
    } catch (err) {
      console.error('Failed to log expense:', err);
    }
  };

  const handleAddReminder = async (input: ReminderInput) => {
    if (!detail) return;
    try {
      await vehicleApi.createReminder(detail, input);
      const updated = await vehicleApi.getVehicleDetail(detail);
      setVehicles((prev) => prev.map((v) => (v.id === detail ? updated : v)));
    } catch (err) {
      console.error('Failed to add reminder:', err);
    }
  };

  const handleChangeLimit = async (name: string, limit: number) => {
    const budget = budgets.find((b) => b.name === name);
    if (!budget?.id) return;
    setBudgets((prev) => prev.map((b) => (b.name === name ? { ...b, limit } : b)));
    try {
      await financeApi.patchBudget(budget.id, { limit_amount: limit });
    } catch (err) {
      console.error('Failed to update budget limit:', err);
      await loadFinance(); // revert the optimistic update by reloading real state
    }
  };

  const handleAddBudget = async (input: { category: string; limit_amount: number; rollover: boolean }) => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      await financeApi.createBudget({ ...input, month });
      await loadFinance();
    } catch (err) {
      console.error('Failed to add budget:', err);
    }
  };

  const handleToggleBudgetRollover = async (name: string, rollover: boolean) => {
    const budget = budgets.find((b) => b.name === name);
    if (!budget?.id) return;
    setBudgets((prev) => prev.map((b) => (b.name === name ? { ...b, rollover } : b)));
    try {
      await financeApi.patchBudget(budget.id, { rollover });
    } catch (err) {
      console.error('Failed to update budget rollover:', err);
      await loadFinance();
    }
  };

  const handleAddCategory = async (name: string) => {
    try {
      await financeApi.createCategory({ name });
      await loadFinance();
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleToggleCategoryArchived = async (id: string, archived: boolean) => {
    setFinanceCategories((prev) => prev.map((c) => (c.id === id ? { ...c, archived } : c)));
    try {
      await financeApi.patchCategory(id, { archived });
    } catch (err) {
      console.error('Failed to update category:', err);
      await loadFinance();
    }
  };

  const handleCancelRecurring = async (id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
    try {
      await financeApi.deleteRecurring(id);
    } catch (err) {
      console.error('Failed to cancel recurring transaction:', err);
      await loadFinance();
    }
  };

  const handleImportCsv = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
    if (result.canceled || !result.assets[0]) return;

    let text: string;
    try {
      text = await new FileSystem.File(result.assets[0].uri).text();
    } catch (err) {
      console.error('Failed to read CSV file:', err);
      Alert.alert('Import failed', 'Could not read that file.');
      return;
    }

    const { rows, skipped } = parseTransactionsCsv(text);
    if (rows.length === 0) {
      Alert.alert('Nothing to import', 'No valid rows found. Expected a header row of date,category,amount,note.');
      return;
    }

    Alert.alert(
      'Import transactions?',
      `Found ${rows.length} valid row${rows.length === 1 ? '' : 's'}${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            let imported = 0;
            for (const row of rows) {
              try {
                await financeApi.createTransaction(row);
                imported++;
              } catch (err) {
                console.error('Failed to import a CSV row:', err);
              }
            }
            await loadFinance();
            Alert.alert('Import complete', `Imported ${imported} of ${rows.length} transactions.`);
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Delete everything?',
      'This permanently deletes all your transactions, budgets, categories, recurring transactions, and vehicles. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([financeApi.clearAllData(), vehicleApi.clearAllData()]);
            } catch (err) {
              console.error('Failed to clear all data:', err);
              Alert.alert('Something went wrong', 'Not everything may have been deleted. Please try again.');
              return;
            }
            await logOut();
          },
        },
      ]
    );
  };

  // 6. Dynamic Store Calculations (keeps views in sync)
  const income = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(txns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const net = income - expenses;

  // Recalculate categories percentages dynamically based on expenses
  const catSpentMap = txns
    .filter((t) => t.amount < 0 && t.cat !== 'Income')
    .reduce((acc, t) => {
      acc[t.cat] = (acc[t.cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const totalCatExpenses = Object.values(catSpentMap).reduce((s, v) => s + v, 0);
  const categories = Object.entries(catSpentMap)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalCatExpenses > 0 ? amount / totalCatExpenses : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Map category spent limits dynamically to budget values
  const budgetsWithSpent = budgets.map((b) => {
    const spent = txns
      .filter((t) => t.amount < 0 && t.cat === b.name)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return { ...b, spent };
  });

  const effectiveMode: 'dark' | 'light' =
    themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;
  const activeTheme: ThemeType = effectiveMode === 'dark' ? DARK : LIGHT;

  const nav = async (t: string) => {
    setTab(t);
    setDetail(null);
    setPushed(null);
    await AsyncStorage.setItem('sw_tab', t);
  };

  const openVehicle = (id: string) => {
    setTab('vehicles');
    setDetail(id);
    setPushed(null);
  };

  const activeVehicle = vehicles.find((v) => v.id === detail);

  // Every screen and quick action reachable from the search modal — kept in one place so it's
  // obvious what's missing when a new screen/action gets added later.
  const searchItems: SearchItem[] = [
    { id: 'nav-home', label: 'Home', subtitle: 'Dashboard overview', icon: IcHome, onSelect: () => nav('home') },
    { id: 'nav-spending', label: 'Spending', subtitle: 'All transactions', icon: IcList, keywords: ['transactions'], onSelect: () => nav('spending') },
    { id: 'nav-vehicles', label: 'Vehicles', subtitle: 'Fuel, maintenance, expenses', icon: IcCar, onSelect: () => nav('vehicles') },
    { id: 'nav-reports', label: 'Reports', subtitle: 'Trends & breakdowns', icon: IcChart, onSelect: () => nav('reports') },
    { id: 'nav-settings', label: 'Settings', subtitle: 'Profile & preferences', icon: IcGear, keywords: ['profile', 'account'], onSelect: () => nav('more') },
    { id: 'nav-budgets', label: 'Budgets', subtitle: 'Monthly category limits', icon: IcGauge, onSelect: () => setPushed({ kind: 'budgets' }) },
    { id: 'nav-categories', label: 'Categories', subtitle: 'Manage spending categories', icon: IcList, onSelect: () => setPushed({ kind: 'categories' }) },
    { id: 'nav-recurring', label: 'Recurring transactions', subtitle: 'Daily, weekly, or monthly repeats', icon: IcGauge, keywords: ['repeat', 'subscription'], onSelect: () => setPushed({ kind: 'recurring' }) },
    { id: 'action-add-txn', label: 'Add transaction', subtitle: 'Log an expense or income', icon: IcPlus, onSelect: () => setSheet('txn') },
    { id: 'action-add-vehicle', label: 'Add a vehicle', subtitle: 'Track a new car or bike', icon: IcCar, onSelect: () => { setEditingVehicle(false); setSheet('vehicle'); } },
    { id: 'action-add-budget', label: 'Add a budget', subtitle: 'Set a monthly category limit', icon: IcGauge, onSelect: () => setSheet('budget') },
    { id: 'action-add-category', label: 'Add a category', subtitle: 'Create a custom spending category', icon: IcPlus, onSelect: () => setSheet('category') },
  ];

  // Complete reactive store to feed screens
  const store: StoreType = {
    user: userProfile.name,
    month: INITIAL_STORE.month,
    income,
    expenses,
    net,
    budget: { limit: budgets.reduce((s, b) => s + b.limit, 0), used: expenses },
    transactions: txns,
    categories,
    budgets: budgetsWithSpent,
    vehicles,
    trend,
    savingsRate: income > 0 ? net / income : 0,
    vehicleBreakdown,
  };

  const gate = (node: React.ReactNode) => (
    <View style={[styles.gate, { backgroundColor: activeTheme.bg }]}>
      <StatusBar style={effectiveMode === 'dark' ? 'light' : 'dark'} />
      {node}
    </View>
  );

  // 7. Loading Splash Screen
  if (!fontsLoaded || !booted) {
    return gate(<SplashView theme={activeTheme} />);
  }

  // 8. Gate navigations
  if (!authed) {
    return gate(<AuthScreen theme={activeTheme} onAuthed={doAuth} />);
  }
  if (!onboarded) {
    return gate(<Onboarding theme={activeTheme} onFinish={finishOnboarding} initialName={pendingName} />);
  }

  // 9. Sub-screens rendering (Stack Navigation Simulation)
  let screen;
  if (activeVehicle) {
    screen = (
      <ScreenVehicleDetail
        theme={activeTheme}
        store={store}
        vehicle={activeVehicle}
        onBack={() => setDetail(null)}
        onAddFuel={() => setSheet('fuel')}
        onEditVehicle={() => {
          setEditingVehicle(true);
          setSheet('vehicle');
        }}
        onAddMaintenance={() => setSheet('maintenance')}
        onAddExpense={() => setSheet('expense')}
        onAddReminder={() => setSheet('reminder')}
      />
    );
  } else if (pushed && pushed.kind === 'budgets') {
    screen = (
      <ScreenBudgets
        theme={activeTheme}
        budgets={store.budgets}
        onChangeLimit={handleChangeLimit}
        onToggleRollover={handleToggleBudgetRollover}
        onAddBudget={() => setSheet('budget')}
        onBack={() => setPushed(null)}
      />
    );
  } else if (pushed && pushed.kind === 'categories') {
    screen = (
      <ScreenCategories
        theme={activeTheme}
        categories={financeCategories}
        onToggleArchived={handleToggleCategoryArchived}
        onAddCategory={() => setSheet('category')}
        onBack={() => setPushed(null)}
      />
    );
  } else if (pushed && pushed.kind === 'recurring') {
    screen = (
      <ScreenRecurring
        theme={activeTheme}
        recurring={recurring}
        onCancel={handleCancelRecurring}
        onBack={() => setPushed(null)}
      />
    );
  } else if (pushed && pushed.kind === 'txn') {
    screen = (
      <ScreenTxnDetail
        theme={activeTheme}
        tx={pushed.tx}
        onBack={() => setPushed(null)}
        onSave={handleUpdateTxn}
        onDelete={handleDeleteTxn}
      />
    );
  } else if (tab === 'home') {
    screen = (
      <ScreenHome
        theme={activeTheme}
        store={store}
        onNav={nav}
        onOpenVehicle={openVehicle}
        onOpenBudgets={() => setPushed({ kind: 'budgets' })}
        onOpenSearch={() => setSearchOpen(true)}
      />
    );
  } else if (tab === 'spending') {
    screen = (
      <ScreenTransactions
        theme={activeTheme}
        store={store}
        onOpenTx={(tx) => setPushed({ kind: 'txn', tx })}
        onNav={nav}
      />
    );
  } else if (tab === 'vehicles') {
    screen = (
      <ScreenVehicles
        theme={activeTheme}
        store={store}
        onOpenVehicle={openVehicle}
        onAddVehicle={() => {
          setEditingVehicle(false);
          setSheet('vehicle');
        }}
        onNav={nav}
      />
    );
  } else if (tab === 'reports') {
    screen = (
      <ScreenReports theme={activeTheme} store={store} onNav={nav} />
    );
  } else {
    screen = (
      <ScreenMore
        theme={activeTheme}
        store={store}
        themeMode={themeMode}
        onOpenThemePicker={() => setSheet('theme')}
        onOpenBudgets={() => setPushed({ kind: 'budgets' })}
        onOpenCategories={() => setPushed({ kind: 'categories' })}
        onOpenRecurring={() => setPushed({ kind: 'recurring' })}
        onLogout={logOut}
        defaultRollover={defaultRollover}
        onToggleDefaultRollover={toggleDefaultRollover}
        activeCategoryCount={financeCategories.filter((c) => !c.archived).length}
        recurringCount={recurring.length}
        userEmail={userEmail}
        photoUri={userProfile.photoUri}
        language={language}
        currency={userProfile.currency}
        dateFormat={dateFormat}
        onEditProfile={() => setSheet('editProfile')}
        onEditLanguage={() => setSheet('language')}
        onEditCurrency={() => setSheet('currency')}
        onEditDateFormat={() => setSheet('dateFormat')}
        onImportCsv={handleImportCsv}
        onClearAllData={handleClearAllData}
      />
    );
  }

  const showTabBar = !pushed;

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <StatusBar style={effectiveMode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.screenWrapper}>{screen}</View>

      {/* custom bottom tab bar */}
      {showTabBar && (
        <AppTabBar
          active={detail ? 'vehicles' : tab}
          onChange={nav}
          onAdd={() => setSheet('txn')}
          theme={activeTheme}
        />
      )}

      {/* bottom sheets */}
      <AddTransactionSheet
        open={sheet === 'txn'}
        onClose={() => setSheet(null)}
        onSave={handleAddTxn}
        theme={activeTheme}
      />
      <AddFuelSheet
        open={sheet === 'fuel'}
        onClose={() => setSheet(null)}
        onSave={handleAddFuel}
        vehicle={activeVehicle}
        theme={activeTheme}
      />
      <AddVehicleSheet
        open={sheet === 'vehicle'}
        onClose={() => {
          setSheet(null);
          setEditingVehicle(false);
        }}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle ? activeVehicle : undefined}
        theme={activeTheme}
      />
      <AddMaintenanceSheet
        open={sheet === 'maintenance'}
        onClose={() => setSheet(null)}
        onSave={handleAddMaintenance}
        theme={activeTheme}
      />
      <AddExpenseSheet
        open={sheet === 'expense'}
        onClose={() => setSheet(null)}
        onSave={handleAddExpense}
        theme={activeTheme}
      />
      <AddReminderSheet
        open={sheet === 'reminder'}
        onClose={() => setSheet(null)}
        onSave={handleAddReminder}
        theme={activeTheme}
      />
      <AddBudgetSheet
        open={sheet === 'budget'}
        onClose={() => setSheet(null)}
        onSave={handleAddBudget}
        defaultRollover={defaultRollover}
        theme={activeTheme}
      />
      <AddCategorySheet
        open={sheet === 'category'}
        onClose={() => setSheet(null)}
        onSave={handleAddCategory}
        theme={activeTheme}
      />
      <EditProfileSheet
        open={sheet === 'editProfile'}
        onClose={() => setSheet(null)}
        onSave={saveProfile}
        initialName={userProfile.name}
        initialPhoto={userProfile.photoUri}
        theme={activeTheme}
      />
      <OptionPickerSheet
        open={sheet === 'currency'}
        onClose={() => setSheet(null)}
        title="Base currency"
        options={['LKR', 'USD', 'INR', 'EUR', 'GBP']}
        value={userProfile.currency}
        onSelect={selectCurrency}
        theme={activeTheme}
      />
      <OptionPickerSheet
        open={sheet === 'language'}
        onClose={() => setSheet(null)}
        title="Language"
        options={['English']}
        value={language}
        onSelect={selectLanguage}
        theme={activeTheme}
      />
      <OptionPickerSheet
        open={sheet === 'theme'}
        onClose={() => setSheet(null)}
        title="Theme"
        options={['Dark', 'Light', 'System']}
        value={themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'System'}
        onSelect={(v) => selectThemeMode(v === 'Dark' ? 'dark' : v === 'Light' ? 'light' : 'system')}
        theme={activeTheme}
      />
      <OptionPickerSheet
        open={sheet === 'dateFormat'}
        onClose={() => setSheet(null)}
        title="Date format"
        options={['DD/MM/YYYY', 'MM/DD/YYYY']}
        value={dateFormat}
        onSelect={(v) => selectDateFormat(v as DateFormatPref)}
        theme={activeTheme}
      />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchItems}
        theme={activeTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
});
