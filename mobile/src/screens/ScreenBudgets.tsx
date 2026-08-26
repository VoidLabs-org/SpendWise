import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { Budget, rs } from '@/constants/Store';
import { GlassCard, SectionLabel, IconBtn, Bar } from '@/components/SharedComponents';
import { IcChevron, IcLock, IcPlus, CAT_ICONS } from '@/components/Icons';

export function ScreenBudgets({
  theme,
  budgets,
  onChangeLimit,
  onAddBudget,
  onBack,
}: {
  theme: ThemeType;
  budgets: Budget[];
  onChangeLimit: (name: string, limit: number) => void;
  onAddBudget: () => void;
  onBack: () => void;
}) {
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const tPct = totalLimit > 0 ? totalSpent / totalLimit : 0;

  const barColor = (p: number) => (p >= 1 ? '#FF5A5A' : p >= 0.8 ? theme.warn : theme.accent);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <IconBtn size={38} onClick={onBack} theme={theme}>
            <IcChevron size={18} style={styles.backChevron} />
          </IconBtn>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Budgets
          </Text>
        </View>
      </View>

      {/* scroll content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyScroll}
      >
        {/* total spent progress */}
        <View
          style={[
            styles.totalCard,
            {
              backgroundColor: theme.surface2,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.totalHeader}>
            <Text
              style={[
                styles.totalLabel,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              Spent of total budget · June
            </Text>
            <Text
              style={[
                styles.totalPct,
                {
                  color: barColor(tPct),
                  fontFamily: theme.mono,
                },
              ]}
            >
              {Math.round(tPct * 100)}%
            </Text>
          </View>
          <Text
            style={[
              styles.totalAmount,
              {
                color: theme.strong,
                fontFamily: theme.monoBold,
              },
            ]}
          >
            {rs(totalSpent)}{' '}
            <Text style={{ fontSize: 16, color: theme.dim }}>/ {rs(totalLimit)}</Text>
          </Text>
          <Bar pct={tPct} color={barColor(tPct)} h={8} theme={theme} />
        </View>

        <SectionLabel style={styles.label} theme={theme}>
          Category budgets · 5 of 8 free
        </SectionLabel>

        {budgets.map((b) => {
          const cat = CAT_ICONS[b.name] || CAT_ICONS.Shopping;
          const pct = b.limit > 0 ? b.spent / b.limit : 0;
          const status = pct >= 1 ? 'Over' : pct >= 0.8 ? 'Near limit' : 'On track';

          return (
            <GlassCard key={b.name} style={styles.budgetCard} theme={theme}>
              <View style={styles.budgetHeader}>
                <View
                  style={[
                    styles.catIcon,
                    {
                      backgroundColor: theme.glass,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <cat.Icon size={19} stroke={cat.color} />
                </View>
                <View style={styles.budgetInfo}>
                  <Text
                    style={[
                      styles.budgetName,
                      {
                        color: theme.text,
                        fontFamily: theme.fontBold,
                      },
                    ]}
                  >
                    {b.name}
                  </Text>
                  <Text
                    style={[
                      styles.budgetLimitLabel,
                      {
                        color: theme.dim,
                        fontFamily: theme.mono,
                      },
                    ]}
                  >
                    {rs(b.spent)} of {rs(b.limit)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        pct >= 1
                          ? 'rgba(255,90,90,0.14)'
                          : pct >= 0.8
                          ? theme.warnDim
                          : theme.accentDim,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: pct >= 0.8 ? barColor(pct) : theme.accent,
                        fontFamily: theme.fontBold,
                      },
                    ]}
                  >
                    {status}
                  </Text>
                </View>
              </View>

              <Bar pct={pct} color={barColor(pct)} h={7} theme={theme} />

              {/* stepper controls */}
              <View style={styles.stepperRow}>
                <Text
                  style={[
                    styles.stepperLabel,
                    {
                      color: theme.dim,
                      fontFamily: theme.font,
                    },
                  ]}
                >
                  Monthly limit
                </Text>
                <TouchableOpacity
                  onPress={() => onChangeLimit(b.name, Math.max(1000, b.limit - 1000))}
                  activeOpacity={0.8}
                  style={[
                    styles.stepBtn,
                    {
                      backgroundColor: theme.glass,
                      borderColor: theme.border2,
                    },
                  ]}
                >
                  <Text style={[styles.stepBtnText, { color: theme.text, fontFamily: theme.font }]}>
                    −
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.stepperVal,
                    {
                      color: theme.text,
                      fontFamily: theme.mono,
                    },
                  ]}
                >
                  {rs(b.limit)}
                </Text>
                <TouchableOpacity
                  onPress={() => onChangeLimit(b.name, b.limit + 1000)}
                  activeOpacity={0.8}
                  style={[
                    styles.stepBtn,
                    {
                      backgroundColor: theme.glass,
                      borderColor: theme.border2,
                    },
                  ]}
                >
                  <Text style={[styles.stepBtnText, { color: theme.text, fontFamily: theme.font }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        })}

        {/* add budget */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAddBudget}
          style={[
            styles.premiumAdd,
            {
              borderColor: theme.border2,
            },
          ]}
        >
          <View
            style={[
              styles.lockIconContainer,
              {
                backgroundColor: theme.accentDim,
              },
            ]}
          >
            <IcPlus size={18} stroke={theme.accent} />
          </View>
          <View style={styles.premiumText}>
            <Text
              style={[
                styles.premiumTitle,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Add a budget
            </Text>
          </View>
        </TouchableOpacity>

        {/* add budget (premium) */}
        <View
          style={[
            styles.premiumAdd,
            {
              borderColor: theme.border2,
            },
          ]}
        >
          <View
            style={[
              styles.lockIconContainer,
              {
                backgroundColor: theme.glass,
              },
            ]}
          >
            <IcLock size={17} stroke={theme.dim} />
          </View>
          <View style={styles.premiumText}>
            <Text
              style={[
                styles.premiumTitle,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Add more budgets
            </Text>
            <Text
              style={[
                styles.premiumSub,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              Unlimited categories with Premium
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.upgradeBtn,
              {
                borderColor: theme.accentDim,
              },
            ]}
          >
            <Text
              style={[
                styles.upgradeText,
                {
                  color: theme.accent,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Upgrade
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.footerNotice,
            {
              color: theme.dim,
              fontFamily: theme.font,
            },
          ]}
        >
          You'll be alerted at 80% and 100% of each budget.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backChevron: {
    transform: [{ rotate: '180deg' }],
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bodyScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  totalCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 12.5,
  },
  totalPct: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -1,
    marginVertical: 10,
    marginBottom: 14,
  },
  label: {
    marginBottom: 12,
  },
  budgetCard: {
    padding: 16,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  budgetLimitLabel: {
    fontSize: 11.5,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  stepperLabel: {
    fontSize: 11.5,
    flex: 1,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -2,
  },
  stepperVal: {
    fontSize: 14,
    minWidth: 78,
    textAlign: 'center',
  },
  premiumAdd: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  lockIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  premiumSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  upgradeBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  upgradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerNotice: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
