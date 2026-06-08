import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { StoreType, rs } from '@/constants/Store';
import { GlassCard, SectionLabel, IconBtn, Bar, TxRow } from '@/components/SharedComponents';
import { IcSearch, IcCar, IcChevron, CAT_ICONS, ReminderIcons } from '@/components/Icons';

export function ScreenHome({
  theme,
  store,
  onNav,
  onOpenVehicle,
  onOpenBudgets,
}: {
  theme: ThemeType;
  store: StoreType;
  onNav: (tab: string) => void;
  onOpenVehicle: (id: string) => void;
  onOpenBudgets: () => void;
}) {
  const recent = store.transactions.slice(0, 4);
  const bTotal = store.budgets.reduce((s, b) => s + b.limit, 0);
  const bSpent = store.budgets.reduce((s, b) => s + b.spent, 0);
  const budgetPct = bSpent / bTotal;

  // primary vehicle
  const primaryVehicle = store.vehicles.find(v => v.primary) || store.vehicles[0];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* header */}
      <View style={styles.header}>
        <View>
          <Text
            style={[
              styles.overviewTitle,
              {
                color: theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {store.month.toUpperCase()} OVERVIEW
          </Text>
          <Text
            style={[
              styles.userName,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Hi, {store.user}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <IconBtn onClick={() => onNav('spending')} theme={theme}>
            <IcSearch size={19} />
          </IconBtn>
          <TouchableOpacity
            onPress={() => onNav('more')}
            activeOpacity={0.8}
            style={[
              styles.avatarBtn,
              {
                borderColor: theme.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color: theme.accent,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {store.user[0]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* balance hero */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.surface2,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.heroHeader}>
          <Text
            style={[
              styles.heroLabel,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            Net balance this month
          </Text>
          <Text
            style={[
              styles.heroBadge,
              {
                color: theme.accent,
                fontFamily: theme.monoBold,
              },
            ]}
          >
            ▲ 12.4%
          </Text>
        </View>
        <Text
          style={[
            styles.heroAmount,
            {
              color: theme.strong,
              fontFamily: theme.monoBold,
            },
          ]}
        >
          {rs(store.net)}
        </Text>
        <View style={styles.heroRow}>
          <View
            style={[
              styles.heroTile,
              {
                backgroundColor: theme.inset,
              },
            ]}
          >
            <Text
              style={[
                styles.heroTileLabel,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              IN
            </Text>
            <Text
              style={[
                styles.heroTileValue,
                {
                  color: theme.accent,
                  fontFamily: theme.monoBold,
                },
              ]}
            >
              {rs(store.income)}
            </Text>
          </View>
          <View
            style={[
              styles.heroTile,
              {
                backgroundColor: theme.inset,
              },
            ]}
          >
            <Text
              style={[
                styles.heroTileLabel,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              OUT
            </Text>
            <Text
              style={[
                styles.heroTileValue,
                {
                  color: theme.strong,
                  fontFamily: theme.monoBold,
                },
              ]}
            >
              {rs(store.expenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* budget strip */}
      <GlassCard
        style={styles.budgetCard}
        onClick={onOpenBudgets}
        theme={theme}
      >
        <View style={styles.budgetHeader}>
          <Text
            style={[
              styles.budgetLabel,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Monthly budget
          </Text>
          <Text
            style={[
              styles.budgetAmount,
              {
                color: budgetPct > 0.8 ? theme.warn : theme.dim,
                fontFamily: theme.mono,
              },
            ]}
          >
            {rs(bSpent)} / {rs(bTotal)}
          </Text>
        </View>
        <Bar
          pct={budgetPct}
          color={budgetPct > 0.8 ? theme.warn : theme.accent}
          h={7}
          theme={theme}
        />
      </GlassCard>

      {/* vehicle callout */}
      {primaryVehicle && (
        <GlassCard
          glow
          style={styles.vehicleCard}
          onClick={() => onOpenVehicle(primaryVehicle.id)}
          theme={theme}
        >
          <View style={styles.vehicleHeader}>
            <View
              style={[
                styles.vehicleIconContainer,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border,
                },
              ]}
            >
              <IcCar size={20} stroke={theme.accent} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text
                style={[
                  styles.vehicleName,
                  {
                    color: theme.text,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                {primaryVehicle.name}
              </Text>
              <Text
                style={[
                  styles.vehiclePlate,
                  {
                    color: theme.dim,
                    fontFamily: theme.mono,
                  },
                ]}
              >
                {primaryVehicle.plate} · Primary
              </Text>
            </View>
            <IcChevron size={16} stroke={theme.dim} />
          </View>
          <View style={styles.vehicleStatsRow}>
            <View style={styles.vehicleStat}>
              <Text
                style={[
                  styles.vehicleStatLabel,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                SPEND
              </Text>
              <Text
                style={[
                  styles.vehicleStatValue,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {rs(primaryVehicle.spend)}
              </Text>
            </View>
            <View style={[styles.vehicleStat, styles.vehicleStatBorder, { borderColor: theme.border }]}>
              <Text
                style={[
                  styles.vehicleStatLabel,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                EFFICIENCY
              </Text>
              <Text
                style={[
                  styles.vehicleStatValue,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {primaryVehicle.eff} km/L
              </Text>
            </View>
            <View style={[styles.vehicleStat, styles.vehicleStatBorder, { borderColor: theme.border }]}>
              <Text
                style={[
                  styles.vehicleStatLabel,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                STATUS
              </Text>
              <Text
                style={[
                  styles.vehicleStatValue,
                  {
                    color: theme.accent,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                OK
              </Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* top spending */}
      <View style={styles.sectionHeader}>
        <SectionLabel theme={theme}>Top spending</SectionLabel>
        <TouchableOpacity onPress={() => onNav('reports')} activeOpacity={0.7}>
          <Text
            style={[
              styles.sectionLink,
              {
                color: theme.accent,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Reports →
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.topSpendingContainer}>
        {store.categories.slice(0, 3).map((c) => {
          const cat = CAT_ICONS[c.name] || CAT_ICONS.Shopping;
          return (
            <View key={c.name} style={styles.spendingRow}>
              <View
                style={[
                  styles.spendingIconContainer,
                  {
                    backgroundColor: theme.glass,
                    borderColor: theme.border,
                  },
                ]}
              >
                <cat.Icon size={19} stroke={cat.color} />
              </View>
              <View style={styles.spendingProgress}>
                <View style={styles.spendingTextRow}>
                  <Text
                    style={[
                      styles.spendingName,
                      {
                        color: theme.text,
                        fontFamily: theme.fontBold,
                      },
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={[
                      styles.spendingAmount,
                      {
                        color: theme.text,
                        fontFamily: theme.mono,
                      },
                    ]}
                  >
                    {rs(c.amount)}
                  </Text>
                </View>
                <Bar pct={c.pct} color={cat.color} theme={theme} />
              </View>
            </View>
          );
        })}
      </View>

      {/* upcoming */}
      <SectionLabel style={styles.sectionHeader} theme={theme}>
        Upcoming · next 7 days
      </SectionLabel>
      <View style={styles.remindersGrid}>
        {primaryVehicle?.reminders.slice(0, 2).map((r) => {
          const IconComp = ReminderIcons[r.iconName] || IcCar;
          return (
            <GlassCard
              key={r.id}
              style={styles.reminderCard}
              onClick={() => onOpenVehicle(primaryVehicle.id)}
              theme={theme}
            >
              <IconComp size={18} stroke={theme.warn} />
              <Text
                numberOfLines={1}
                style={[
                  styles.reminderTitle,
                  {
                    color: theme.text,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                {r.title}
              </Text>
              <Text
                style={[
                  styles.reminderVehicle,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                {primaryVehicle.name}
              </Text>
              <Text
                style={[
                  styles.reminderDue,
                  {
                    color: theme.warn,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {r.due}
              </Text>
            </GlassCard>
          );
        })}
      </View>

      {/* recent */}
      <View style={styles.sectionHeader}>
        <SectionLabel theme={theme}>Recent</SectionLabel>
        <TouchableOpacity onPress={() => onNav('spending')} activeOpacity={0.7}>
          <Text
            style={[
              styles.sectionLink,
              {
                color: theme.accent,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            See all
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.recentContainer}>
        {recent.map((t, i) => {
          const cat = CAT_ICONS[t.cat] || CAT_ICONS.Income;
          return (
            <TxRow
              key={t.id}
              icon={cat.Icon}
              iconColor={cat.color}
              title={t.name}
              sub={t.when}
              amount={t.amount}
              last={i === 0 ? 'first' : ''}
              theme={theme}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  overviewTitle: {
    fontSize: 12.5,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12.5,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.5,
    marginTop: 8,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroTile: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroTileLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroTileValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetCard: {
    padding: 16,
    marginBottom: 14,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 12.5,
  },
  vehicleCard: {
    padding: 18,
    marginBottom: 22,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  vehicleIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  vehiclePlate: {
    fontSize: 11,
  },
  vehicleStatsRow: {
    flexDirection: 'row',
  },
  vehicleStat: {
    flex: 1,
  },
  vehicleStatBorder: {
    borderLeftWidth: 1,
    paddingLeft: 12,
  },
  vehicleStatLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  vehicleStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  topSpendingContainer: {
    marginBottom: 22,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  spendingIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendingProgress: {
    flex: 1,
  },
  spendingTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spendingName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  spendingAmount: {
    fontSize: 13,
  },
  remindersGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  reminderCard: {
    flex: 1,
    padding: 14,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  reminderVehicle: {
    fontSize: 11,
    marginTop: 2,
  },
  reminderDue: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  recentContainer: {
    marginBottom: 22,
  },
});
