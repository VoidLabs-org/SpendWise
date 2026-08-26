import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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
import { ScreenTxnDetail } from '@/screens/ScreenTxnDetail';
import {
  AddTransactionSheet,
  AddFuelSheet,
  AddVehicleSheet,
  AddMaintenanceSheet,
  AddExpenseSheet,
  AddReminderSheet,
  AddBudgetSheet,
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
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [tab, setTab] = useState('home');
  const [detail, setDetail] = useState<string | null>(null); // vehicle id
  const [pushed, setPushed] = useState<{ kind: 'budgets' } | { kind: 'txn'; tx: Transaction } | null>(null);
  const [sheet, setSheet] = useState<
    'txn' | 'fuel' | 'vehicle' | 'maintenance' | 'expense' | 'reminder' | 'budget' | null
  >(null);
  const [editingVehicle, setEditingVehicle] = useState(false);

  // Database states
  const [txns, setTxns] = useState<Transaction[]>(INITIAL_STORE.transactions);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_STORE.vehicles);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_STORE.budgets);
  const [trend, setTrend] = useState<{ m: string; v: number }[]>(INITIAL_STORE.trend);
  const [vehicleBreakdown, setVehicleBreakdown] = useState<{ label: string; v: number; color: string }[]>(
    INITIAL_STORE.vehicleBreakdown
  );
  const [userProfile, setUserProfile] = useState({ name: INITIAL_STORE.user, currency: 'LKR' });
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

        // A stored refresh token means "was logged in" — exchange it for a fresh
        // access token so the session survives an app restart without re-entering credentials.
        const storedRefreshToken = await getRefreshToken();
        if (storedRefreshToken) {
          try {
            const tokens = await authApi.refresh(storedRefreshToken);
            await saveTokens(tokens.access_token, tokens.refresh_token);
            setAuthed(true);
          } catch {
            await clearTokens();
          }
        }

        if (storedOnboard === '1') setOnboarded(true);
        if (storedTheme) setThemeMode(storedTheme as 'dark' | 'light');
        if (storedTab) setTab(storedTab);
        if (storedProfile) setUserProfile(JSON.parse(storedProfile));
        if (storedDefaultRollover === '1') setDefaultRollover(true);
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
      const [freshTxns, freshBudgets, freshTrend, freshVehicleBreakdown] = await Promise.all([
        financeApi.listTransactionsMapped(),
        financeApi.listBudgetsMapped(),
        financeApi.getTrendMapped(),
        financeApi.getVehicleBreakdownMapped(),
      ]);
      setTxns(freshTxns);
      setBudgets(freshBudgets);
      setTrend(freshTrend);
      setVehicleBreakdown(freshVehicleBreakdown);
    } catch (err) {
      console.error('Failed to load transactions/budgets:', err);
    }
  };

  useEffect(() => {
    if (authed) loadFinance();
  }, [authed]);

  const toggleTheme = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    await AsyncStorage.setItem('sw_theme', nextMode);
  };

  const toggleDefaultRollover = async () => {
    const next = !defaultRollover;
    setDefaultRollover(next);
    await AsyncStorage.setItem('sw_default_rollover', next ? '1' : '0');
  };

  const finishOnboarding = async (name: string, currency: string) => {
    const profile = { name, currency };
    setUserProfile(profile);
    setOnboarded(true);
    await AsyncStorage.setItem('sw_onboarded', '1');
    await AsyncStorage.setItem('sw_profile', JSON.stringify(profile));
  };

  const doAuth = () => {
    // AuthScreen already performed the login/register call and stored tokens itself.
    setAuthed(true);
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
  };

  // 5. Database Modification Handlers
  const handleAddTxn = async (t: Transaction) => {
    try {
      await financeApi.createTransaction({ amount: t.amount, category: t.cat, note: t.note });
      await loadFinance();
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const handleUpdateTxn = async (t: Transaction) => {
    try {
      await financeApi.updateTransaction(t.id, { amount: t.amount, category: t.cat, note: t.note });
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

  const activeTheme: ThemeType = themeMode === 'dark' ? DARK : LIGHT;

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
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
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
    return gate(<Onboarding theme={activeTheme} onFinish={finishOnboarding} />);
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
        onToggleTheme={toggleTheme}
        onOpenBudgets={() => setPushed({ kind: 'budgets' })}
        onLogout={logOut}
        defaultRollover={defaultRollover}
        onToggleDefaultRollover={toggleDefaultRollover}
      />
    );
  }

  const showTabBar = !pushed;

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
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
