import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { StoreType, Transaction, rs } from '@/constants/Store';
import { GlassCard, SectionLabel, Chip, TxRow, AvatarButton } from '@/components/SharedComponents';
import { CAT_ICONS } from '@/components/Icons';

export function ScreenTransactions({
  theme,
  store,
  onOpenTx,
  onNav,
}: {
  theme: ThemeType;
  store: StoreType;
  onOpenTx: (tx: Transaction) => void;
  onNav: (tab: string) => void;
}) {
  const [filter, setFilter] = useState('All');
  const cats = ['All', 'Income', 'Food', 'Fuel', 'Shopping', 'Bills', 'Entertainment', 'Health'];
  const list = filter === 'All' ? store.transactions : store.transactions.filter(t => t.cat === filter);

  // Group transactions by day
  const groups: { day: string; items: Transaction[] }[] = [];
  list.forEach(t => {
    const g = groups.find(x => x.day === t.day);
    if (g) {
      g.items.push(t);
    } else {
      groups.push({ day: t.day, items: [t] });
    }
  });

  const totalOut = list.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const totalIn = list.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Spending
          </Text>
          <AvatarButton initial={store.user[0]} onClick={() => onNav('more')} theme={theme} />
        </View>

        {/* IN / OUT summary */}
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard} theme={theme}>
            <Text
              style={[
                styles.summaryLabel,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              MONEY IN
            </Text>
            <Text
              style={[
                styles.summaryVal,
                {
                  color: theme.accent,
                  fontFamily: theme.monoBold,
                },
              ]}
            >
              {rs(totalIn)}
            </Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard} theme={theme}>
            <Text
              style={[
                styles.summaryLabel,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              MONEY OUT
            </Text>
            <Text
              style={[
                styles.summaryVal,
                {
                  color: theme.strong,
                  fontFamily: theme.monoBold,
                },
              ]}
            >
              {rs(Math.abs(totalOut))}
            </Text>
          </GlassCard>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterWrapper}
        >
          {cats.map(c => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)} theme={theme}>
              {c}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listScroll}
      >
        {groups.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            No {filter} transactions yet.
          </Text>
        )}
        {groups.map((g) => (
          <View key={g.day} style={styles.groupContainer}>
            <SectionLabel style={styles.groupHeader} theme={theme}>
              {g.day}
            </SectionLabel>
            <GlassCard style={styles.groupCard} theme={theme}>
              {g.items.map((t, i) => {
                const cat = CAT_ICONS[t.cat] || CAT_ICONS.Income;
                return (
                  <TxRow
                    key={t.id}
                    icon={cat.Icon}
                    iconColor={cat.color}
                    title={t.name}
                    sub={`${t.cat}${t.note ? ' · ' + t.note : ''}`}
                    amount={t.amount}
                    last={i === 0 ? 'first' : ''}
                    onClick={() => onOpenTx(t)}
                    theme={theme}
                  />
                );
              })}
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterWrapper: {
    marginHorizontal: -18,
  },
  filterScroll: {
    paddingHorizontal: 18,
    paddingBottom: 6,
    gap: 8,
    flexDirection: 'row',
  },
  listScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 60,
  },
  groupContainer: {
    marginBottom: 8,
  },
  groupHeader: {
    marginVertical: 14,
    marginBottom: 6,
  },
  groupCard: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
});
