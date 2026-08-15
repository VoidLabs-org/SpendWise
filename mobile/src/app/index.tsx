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
import { AddTransactionSheet, AddFuelSheet } from '@/screens/Sheets';

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
  const [sheet, setSheet] = useState<'txn' | 'fuel' | null>(null);

  // Database states
  const [txns, setTxns] = useState<Transaction[]>(INITIAL_STORE.transactions);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_STORE.vehicles);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_STORE.budgets);
  const [userProfile, setUserProfile] = useState({ name: INITIAL_STORE.user, currency: 'LKR' });

  // 3. Load persisted settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const storedOnboard = await AsyncStorage.getItem('sw_onboarded');
        const storedTheme = await AsyncStorage.getItem('sw_theme');
        const storedTab = await AsyncStorage.getItem('sw_tab');
        const storedTxns = await AsyncStorage.getItem('sw_txns');
        const storedVehicles = await AsyncStorage.getItem('sw_vehicles');
        const storedBudgets = await AsyncStorage.getItem('sw_budgets');
        const storedProfile = await AsyncStorage.getItem('sw_profile');

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
        if (storedTxns) setTxns(JSON.parse(storedTxns));
        if (storedVehicles) setVehicles(JSON.parse(storedVehicles));
        if (storedBudgets) setBudgets(JSON.parse(storedBudgets));
        if (storedProfile) setUserProfile(JSON.parse(storedProfile));
      } catch (err) {
        console.error('Failed to load local storage:', err);
      } finally {
        // Delay boot splash slightly like the HTML version
        setTimeout(() => setBooted(true), 1500);
      }
    }
    loadSettings();
  }, []);

  // 4. Save states when modified
  const saveTxns = async (newTxns: Transaction[]) => {
    setTxns(newTxns);
    await AsyncStorage.setItem('sw_txns', JSON.stringify(newTxns));
  };

  const saveVehicles = async (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    await AsyncStorage.setItem('sw_vehicles', JSON.stringify(newVehicles));
  };

  const saveBudgets = async (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    await AsyncStorage.setItem('sw_budgets', JSON.stringify(newBudgets));
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    await AsyncStorage.setItem('sw_theme', nextMode);
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
  const handleAddTxn = (t: Transaction) => {
    saveTxns([t, ...txns]);
  };

  const handleUpdateTxn = (t: Transaction) => {
    saveTxns(txns.map((x) => (x.id === t.id ? t : x)));
  };

  const handleDeleteTxn = (id: string) => {
    saveTxns(txns.filter((x) => x.id !== id));
  };

  const handleAddFuel = (entry: any) => {
    if (!detail) return;
    saveVehicles(
      vehicles.map((v) =>
        v.id === detail
          ? {
              ...v,
              fuel: [entry, ...v.fuel],
              odo: Math.max(v.odo, entry.odo),
              eff: entry.eff,
              spend: v.spend + entry.cost,
            }
          : v
      )
    );

    // Also automatically log a transaction for this fuel fill-up!
    handleAddTxn({
      id: 't_fuel_' + Date.now(),
      name: `${activeVehicle?.name || 'Vehicle'} Fuel`,
      cat: 'Fuel',
      amount: -entry.cost,
      when: entry.when === 'Today' ? 'Today · Just now' : entry.when,
      day: entry.when,
      note: `${entry.litres} L fill-up`,
    });
  };

  const handleChangeLimit = (name: string, limit: number) => {
    saveBudgets(budgets.map((b) => (b.name === name ? { ...b, limit } : b)));
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
    trend: INITIAL_STORE.trend,
    savingsRate: income > 0 ? net / income : 0,
    vehicleBreakdown: INITIAL_STORE.vehicleBreakdown,
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
      />
    );
  } else if (pushed && pushed.kind === 'budgets') {
    screen = (
      <ScreenBudgets
        theme={activeTheme}
        budgets={store.budgets}
        onChangeLimit={handleChangeLimit}
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
      />
    );
  } else if (tab === 'vehicles') {
    screen = (
      <ScreenVehicles
        theme={activeTheme}
        store={store}
        onOpenVehicle={openVehicle}
      />
    );
  } else if (tab === 'reports') {
    screen = (
      <ScreenReports theme={activeTheme} store={store} />
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
