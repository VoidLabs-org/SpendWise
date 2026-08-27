import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { rs } from '@/constants/Store';
import { GlassCard, SectionLabel, IconBtn } from '@/components/SharedComponents';
import { IcChevron, IcTrash, IcArrowUp, CAT_ICONS } from '@/components/Icons';
import { BackendRecurringTransaction } from '@/services/api/financeApi';

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

export function ScreenRecurring({
  theme,
  recurring,
  onCancel,
  onBack,
}: {
  theme: ThemeType;
  recurring: BackendRecurringTransaction[];
  onCancel: (id: string) => void;
  onBack: () => void;
}) {
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
            Recurring transactions
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyScroll}>
        {recurring.length === 0 ? (
          <View style={styles.emptyState}>
            <IcArrowUp size={28} stroke={theme.dim2} />
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              No recurring transactions yet. Set one up from the amount sheet when adding a
              transaction — turn on "Repeat" and pick daily, weekly, or monthly.
            </Text>
          </View>
        ) : (
          <>
            <SectionLabel style={styles.label} theme={theme}>{`Active · ${recurring.length}`}</SectionLabel>
            {recurring.map((r) => {
              const meta = CAT_ICONS[r.category] || CAT_ICONS.Shopping;
              return (
                <GlassCard key={r.id} style={styles.row} theme={theme}>
                  <View
                    style={[
                      styles.catIcon,
                      {
                        backgroundColor: theme.glass,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <meta.Icon size={18} stroke={meta.color} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text
                      style={[
                        styles.rowName,
                        {
                          color: theme.text,
                          fontFamily: theme.fontBold,
                        },
                      ]}
                    >
                      {r.category}
                    </Text>
                    <Text
                      style={[
                        styles.rowSub,
                        {
                          color: theme.dim,
                          fontFamily: theme.mono,
                        },
                      ]}
                    >
                      {FREQUENCY_LABEL[r.frequency] || r.frequency} · {rs(Math.abs(r.amount))}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onCancel(r.id)} activeOpacity={0.7} hitSlop={8}>
                    <IcTrash size={18} stroke={theme.warn} />
                  </TouchableOpacity>
                </GlassCard>
              );
            })}
          </>
        )}
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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  bodyScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  label: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
