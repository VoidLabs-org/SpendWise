import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ThemeType } from '@/constants/theme';
import { StoreType, rs } from '@/constants/Store';
import { GlassCard, SectionLabel, Segmented, Bar, AvatarButton } from '@/components/SharedComponents';
import { IcStar } from '@/components/Icons';

function TrendChart({
  data,
  theme,
}: {
  data: { m: string; v: number }[];
  theme: ThemeType;
}) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <View style={styles.trendContainer}>
      {data.map((d, i) => (
        <View key={d.m} style={styles.trendCol}>
          <Text
            style={[
              styles.trendVal,
              {
                color: theme.dim,
                fontFamily: theme.mono,
              },
            ]}
          >
            {Math.round(d.v / 1000)}k
          </Text>
          <View
            style={[
              styles.trendBar,
              {
                height: Math.max(10, (d.v / max) * 92),
                backgroundColor: i === data.length - 1 ? theme.accent : theme.accentSoft,
              },
            ]}
          />
          <Text
            style={[
              styles.trendMonth,
              {
                color: theme.dim2,
                fontFamily: theme.mono,
              },
            ]}
          >
            {d.m}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DonutChart({
  cats,
  theme,
}: {
  cats: { name: string; amount: number; pct: number }[];
  theme: ThemeType;
}) {
  const total = cats.reduce((s, c) => s + c.amount, 0);
  const palette = [theme.accent, '#FF8A65', '#6EC6FF', '#FFD24D', theme.ai];

  // SVG Circle calculations
  const radius = 35;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <View style={styles.donutRow}>
      {/* SVG Donut */}
      <View style={styles.donutSvgWrapper}>
        <Svg width={116} height={116} viewBox="0 0 100 100">
          {cats.map((c, i) => {
            const percentage = c.amount / total;
            const strokeDashoffset = circumference - percentage * circumference;
            const rotation = (currentOffset / total) * 360;
            currentOffset += c.amount;

            return (
              <Circle
                key={c.name}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={palette[i % palette.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                origin="50, 50"
                rotation={rotation}
              />
            );
          })}
        </Svg>
        {/* Center label */}
        <View
          style={[
            styles.donutCenter,
            {
              backgroundColor: theme.bg,
            },
          ]}
        >
          <Text
            style={[
              styles.donutCenterLabel,
              {
                color: theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            SPENT
          </Text>
          <Text
            style={[
              styles.donutCenterVal,
              {
                color: theme.strong,
                fontFamily: theme.monoBold,
              },
            ]}
          >
            {Math.round(total / 1000)}k
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {cats.map((c, i) => (
          <View key={c.name} style={styles.legendRow}>
            <View
              style={[
                styles.legendColor,
                {
                  backgroundColor: palette[i % palette.length],
                },
              ]}
            />
            <Text
              style={[
                styles.legendLabel,
                {
                  color: theme.text,
                  fontFamily: theme.font,
                },
              ]}
            >
              {c.name}
            </Text>
            <Text
              style={[
                styles.legendVal,
                {
                  color: theme.dim,
                  fontFamily: theme.mono,
                },
              ]}
            >
              {Math.round((c.amount / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ScreenReports({
  theme,
  store,
  onNav,
}: {
  theme: ThemeType;
  store: StoreType;
  onNav: (tab: string) => void;
}) {
  const [range, setRange] = useState('6mo');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.header, styles.titleRow]}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          Reports
        </Text>
        <AvatarButton initial={store.user[0]} onClick={() => onNav('more')} theme={theme} />
      </View>

      <View style={styles.segmentedWrapper}>
        <Segmented
          options={[
            { value: '6mo', label: 'Last 6 months' },
            { value: 'month', label: 'This month' },
          ]}
          value={range}
          onChange={setRange}
          theme={theme}
        />
      </View>

      {/* summary tiles */}
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
            SAVINGS RATE
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
            {Math.round(store.savingsRate * 100)}%
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
            AVG / MONTH
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
            98k
          </Text>
        </GlassCard>
      </View>

      {/* trend */}
      <SectionLabel style={styles.label} theme={theme}>
        {range === '6mo' ? 'Spending trend' : 'Daily spend'}
      </SectionLabel>
      <GlassCard style={styles.trendCard} theme={theme}>
        <TrendChart data={store.trend} theme={theme} />
      </GlassCard>

      {/* breakdown donut */}
      <SectionLabel style={styles.label} theme={theme}>
        By category
      </SectionLabel>
      <GlassCard style={styles.donutCard} theme={theme}>
        <DonutChart cats={store.categories} theme={theme} />
      </GlassCard>

      {/* vehicle cost */}
      <SectionLabel style={styles.label} theme={theme}>
        Vehicle cost · June
      </SectionLabel>
      <GlassCard style={styles.vehicleCard} theme={theme}>
        {store.vehicleBreakdown.map((b) => (
          <View key={b.label} style={styles.vehicleRow}>
            <View style={styles.vehicleTextRow}>
              <Text
                style={[
                  styles.vehicleLabel,
                  {
                    color: theme.text,
                    fontFamily: theme.font,
                  },
                ]}
              >
                {b.label}
              </Text>
              <Text
                style={[
                  styles.vehicleValue,
                  {
                    color: theme.dim,
                    fontFamily: theme.mono,
                  },
                ]}
              >
                {rs(b.v)}
              </Text>
            </View>
            <Bar pct={b.v / 28450} color={b.color} theme={theme} />
          </View>
        ))}
      </GlassCard>

      {/* AI insights — premium */}
      <SectionLabel style={styles.label} theme={theme}>
        AI insights
      </SectionLabel>
      <View
        style={[
          styles.aiCard,
          {
            backgroundColor: theme.aiBg || theme.glass,
            borderColor: theme.aiBorder || theme.border,
          },
        ]}
      >
        <View style={styles.aiHeader}>
          <IcStar size={17} stroke="#B388FF" />
          <Text
            style={[
              styles.aiTitle,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Smart insights
          </Text>
          <View style={[styles.aiBadge, { borderColor: 'rgba(179,136,255,0.4)' }]}>
            <Text style={[styles.aiBadgeText, { color: theme.ai, fontFamily: theme.fontBold }]}>
              PREMIUM
            </Text>
          </View>
        </View>
        {[
          'You spent 23% more on Food this month vs last month.',
          "Your car's fuel efficiency dropped 1.6 km/L — check tyre pressure.",
          'On track to overspend the Food budget by Rs\u202F3,200 this month.',
        ].map((t, i) => (
          <View
            key={i}
            style={[
              styles.aiRow,
              {
                borderTopColor: theme.border,
                borderTopWidth: i === 0 ? 0 : 1,
              },
            ]}
          >
            <View style={[styles.aiDot, { backgroundColor: theme.ai }]} />
            <Text
              style={[
                styles.aiText,
                {
                  color: theme.text,
                  fontFamily: theme.font,
                },
              ]}
            >
              {t}
            </Text>
          </View>
        ))}
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
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  segmentedWrapper: {
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '600',
  },
  label: {
    marginBottom: 10,
  },
  trendCard: {
    padding: 16,
    marginBottom: 18,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 140,
    paddingTop: 10,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  trendVal: {
    fontSize: 9.5,
  },
  trendBar: {
    width: '64%',
    borderRadius: 7,
  },
  trendMonth: {
    fontSize: 10,
  },
  donutCard: {
    padding: 18,
    marginBottom: 18,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  donutSvgWrapper: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  donutCenterVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendContainer: {
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legendColor: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12.5,
  },
  legendVal: {
    fontSize: 12,
  },
  vehicleCard: {
    padding: 16,
    marginBottom: 18,
  },
  vehicleRow: {
    marginBottom: 10,
  },
  vehicleTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  vehicleLabel: {
    fontSize: 12.5,
  },
  vehicleValue: {
    fontSize: 12,
  },
  aiCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiBadge: {
    marginLeft: 'auto',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  aiRow: {
    flexDirection: 'row',
    gap: 9,
    paddingVertical: 8,
  },
  aiDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    flexShrink: 0,
  },
  aiText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
});
