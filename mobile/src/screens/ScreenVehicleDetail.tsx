import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { StoreType, Vehicle, rs, FuelLog } from '@/constants/Store';
import { GlassCard, SectionLabel, IconBtn, Segmented, Bar } from '@/components/SharedComponents';
import { IcChevron, IcEdit, IcPlus, IcFuel, IcWrench, IcStar, IcBell, IcCamera, ReminderIcons } from '@/components/Icons';

function VStat({
  label,
  value,
  accent,
  theme,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  theme: ThemeType;
}) {
  return (
    <View style={styles.vStat}>
      <Text
        style={[
          styles.vStatLabel,
          {
            color: theme.dim,
            fontFamily: theme.font,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.vStatValue,
          {
            color: accent ? theme.accent : theme.strong,
            fontFamily: theme.monoBold,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function FuelTrend({ logs, theme }: { logs: FuelLog[]; theme: ThemeType }) {
  if (logs.length === 0) return null;
  const max = Math.max(...logs.map(l => l.eff));
  return (
    <View style={styles.trendContainer}>
      {[...logs].reverse().map((l, i) => (
        <View key={l.id} style={styles.trendCol}>
          <Text
            style={[
              styles.trendVal,
              {
                color: theme.dim,
                fontFamily: theme.mono,
              },
            ]}
          >
            {l.eff}
          </Text>
          <View
            style={[
              styles.trendBar,
              {
                height: Math.max(10, (l.eff / max) * 58),
                backgroundColor: i === logs.length - 1 ? theme.accent : theme.accentSoft,
              },
            ]}
          />
          <Text
            style={[
              styles.trendLabel,
              {
                color: theme.dim2,
                fontFamily: theme.mono,
              },
            ]}
          >
            {l.when.split(' ')[1] || l.when}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ScreenVehicleDetail({
  theme,
  store,
  vehicle: v,
  onBack,
  onAddFuel,
  onEditVehicle,
  onAddMaintenance,
  onAddExpense,
  onAddReminder,
}: {
  theme: ThemeType;
  store: StoreType;
  vehicle: Vehicle;
  onBack: () => void;
  onAddFuel: () => void;
  onEditVehicle: () => void;
  onAddMaintenance: () => void;
  onAddExpense: () => void;
  onAddReminder: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'maintenance', label: 'Service' },
    { value: 'reminders', label: 'Reminders' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <IconBtn size={38} onClick={onBack} theme={theme}>
            <IcChevron size={18} style={styles.backChevron} />
          </IconBtn>
          <View style={styles.info}>
            <Text
              style={[
                styles.name,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {v.name}
            </Text>
            <Text
              style={[
                styles.plate,
                {
                  color: theme.dim,
                  fontFamily: theme.mono,
                },
              ]}
            >
              {v.plate} · {v.fuelType}
            </Text>
          </View>
          <IconBtn size={38} onClick={onEditVehicle} theme={theme}>
            <IcEdit size={18} />
          </IconBtn>
        </View>

        {/* photo */}
        <TouchableOpacity onPress={onEditVehicle} activeOpacity={0.85} style={styles.photoBanner}>
          {v.photoUrl ? (
            <Image source={{ uri: v.photoUrl }} style={styles.photoBannerImg} />
          ) : (
            <View
              style={[
                styles.photoBannerEmpty,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border,
                },
              ]}
            >
              <IcCamera size={18} stroke={theme.dim} />
              <Text
                style={[
                  styles.photoBannerEmptyText,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                Add a photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* hero stats */}
        <GlassCard glow style={styles.heroCard} theme={theme}>
          <VStat label="ODOMETER" value={v.odo.toLocaleString()} theme={theme} />
          <VStat label="KM / L" value={v.eff} accent theme={theme} />
          <VStat label="COST / KM" value={'Rs\u202F' + v.costPerKm} theme={theme} />
          <VStat label="RANGE" value={v.range + ' km'} theme={theme} />
        </GlassCard>

        {/* sub-tabs */}
        <Segmented options={tabs} value={tab} onChange={setTab} theme={theme} />
      </View>

      {/* tab body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyScroll}
      >
        {tab === 'overview' && (
          <View>
            <SectionLabel style={styles.label} theme={theme}>
              This month
            </SectionLabel>
            <GlassCard style={styles.costCard} theme={theme}>
              <Text
                style={[
                  styles.costVal,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {rs(v.spend)}
              </Text>
              <Text
                style={[
                  styles.costSub,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                Total cost of ownership · June
              </Text>
              {store.vehicleBreakdown.map((b) => (
                <View key={b.label} style={styles.breakdownRow}>
                  <View style={styles.breakdownTextRow}>
                    <Text
                      style={[
                        styles.breakdownLabel,
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
                        styles.breakdownVal,
                        {
                          color: theme.dim,
                          fontFamily: theme.mono,
                        },
                      ]}
                    >
                      {rs(b.v)}
                    </Text>
                  </View>
                  <Bar pct={b.v / v.spend} color={b.color} theme={theme} />
                </View>
              ))}
            </GlassCard>

            <TouchableOpacity
              onPress={onAddExpense}
              activeOpacity={0.8}
              style={[
                styles.actionOutlineBtn,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border2,
                },
              ]}
            >
              <IcPlus size={17} stroke={theme.text} sw={2.2} />
              <Text
                style={[
                  styles.actionOutlineBtnText,
                  {
                    color: theme.text,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                Log an expense
              </Text>
            </TouchableOpacity>

            <SectionLabel style={styles.label} theme={theme}>
              Fuel efficiency trend
            </SectionLabel>
            <GlassCard style={styles.chartCard} theme={theme}>
              <FuelTrend logs={v.fuel} theme={theme} />
            </GlassCard>

            <GlassCard style={[styles.reminderCallout, { borderColor: 'rgba(199,249,75,0.25)' }]} theme={theme}>
              <View
                style={[
                  styles.starIcon,
                  {
                    backgroundColor: theme.accentDim,
                  },
                ]}
              >
                <IcStar size={18} stroke={theme.accent} />
              </View>
              <Text
                style={[
                  styles.calloutText,
                  {
                    color: theme.text,
                    fontFamily: theme.font,
                  },
                ]}
              >
                Efficiency is steady. Next service due in{' '}
                <Text style={{ color: theme.accent, fontWeight: '700' }}>~2,700 km</Text>.
              </Text>
            </GlassCard>
          </View>
        )}

        {tab === 'fuel' && (
          <View>
            <TouchableOpacity
              onPress={onAddFuel}
              activeOpacity={0.8}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <IcPlus size={18} stroke={theme.accentInk} sw={2.4} />
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: theme.accentInk,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                Log a fill-up
              </Text>
            </TouchableOpacity>

            <GlassCard style={styles.chartCard} theme={theme}>
              <FuelTrend logs={v.fuel} theme={theme} />
            </GlassCard>

            <SectionLabel style={styles.label} theme={theme}>
              Fill-up history
            </SectionLabel>
            <GlassCard style={styles.listCard} theme={theme}>
              {v.fuel.map((f, i) => (
                <View
                  key={f.id}
                  style={[
                    styles.listRow,
                    {
                      borderTopColor: theme.border,
                      borderTopWidth: i === 0 ? 0 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.rowIcon,
                      {
                        backgroundColor: theme.glass,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <IcFuel size={18} stroke={theme.accent} />
                  </View>
                  <View style={styles.rowDetails}>
                    <Text
                      style={[
                        styles.rowTitle,
                        {
                          color: theme.text,
                          fontFamily: theme.fontBold,
                        },
                      ]}
                    >
                      {f.litres} L · {f.eff} km/L
                    </Text>
                    <Text
                      style={[
                        styles.rowSub,
                        {
                          color: theme.dim,
                          fontFamily: theme.font,
                        },
                      ]}
                    >
                      {f.when} · {f.station}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rowVal,
                      {
                        color: theme.strong,
                        fontFamily: theme.monoBold,
                      },
                    ]}
                  >
                    {rs(f.cost)}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {tab === 'maintenance' && (
          <View>
            <TouchableOpacity
              onPress={onAddMaintenance}
              activeOpacity={0.8}
              style={[
                styles.actionOutlineBtn,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border2,
                },
              ]}
            >
              <IcWrench size={17} stroke={theme.text} />
              <Text
                style={[
                  styles.actionOutlineBtnText,
                  {
                    color: theme.text,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                Log a service
              </Text>
            </TouchableOpacity>

            {v.maintenance.map((m) => (
              <GlassCard key={m.id} style={styles.serviceCard} theme={theme}>
                <View style={styles.serviceHeader}>
                  <View
                    style={[
                      styles.serviceIcon,
                      {
                        backgroundColor: theme.glass,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <IcWrench size={16} stroke={theme.warn} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text
                      style={[
                        styles.serviceTitle,
                        {
                          color: theme.text,
                          fontFamily: theme.fontBold,
                        },
                      ]}
                    >
                      {m.name}
                    </Text>
                    <Text
                      style={[
                        styles.serviceSub,
                        {
                          color: theme.dim,
                          fontFamily: theme.font,
                        },
                      ]}
                    >
                      {m.when} · {m.odo.toLocaleString()} km
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.serviceCost,
                      {
                        color: theme.strong,
                        fontFamily: theme.monoBold,
                      },
                    ]}
                  >
                    {rs(m.cost)}
                  </Text>
                </View>
                {m.next !== '—' && (
                  <View
                    style={[
                      styles.serviceNext,
                      {
                        borderTopColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceNextText,
                        {
                          color: theme.accent,
                          fontFamily: theme.mono,
                        },
                      ]}
                    >
                      ↺ {m.next}
                    </Text>
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {tab === 'reminders' && (
          <View>
            <TouchableOpacity
              onPress={onAddReminder}
              activeOpacity={0.8}
              style={[
                styles.actionOutlineBtn,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border2,
                },
              ]}
            >
              <IcBell size={17} stroke={theme.text} />
              <Text
                style={[
                  styles.actionOutlineBtnText,
                  {
                    color: theme.text,
                    fontFamily: theme.fontBold,
                  },
                ]}
              >
                Add a reminder
              </Text>
            </TouchableOpacity>

            {v.reminders.map((r) => {
              const IconComp = ReminderIcons[r.iconName] || IcStar;
              return (
                <GlassCard
                  key={r.id}
                  style={styles.reminderCard}
                  theme={theme}
                >
                  <View
                    style={[
                      styles.rowIcon,
                      {
                        backgroundColor: r.kind === 'urgent' ? theme.warnDim : theme.glass,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <IconComp size={18} stroke={r.kind === 'urgent' ? theme.warn : theme.dim} />
                  </View>
                  <View style={styles.rowDetails}>
                    <Text
                      style={[
                        styles.rowTitle,
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
                        styles.rowSub,
                        {
                          color: theme.dim,
                          fontFamily: theme.font,
                        },
                      ]}
                    >
                      {r.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.reminderDue,
                      {
                        color: r.kind === 'urgent' ? theme.warn : theme.accent,
                        fontFamily: theme.monoBold,
                      },
                    ]}
                  >
                    {r.due}
                  </Text>
                </GlassCard>
              );
            })}
            <Text
              style={[
                styles.reminderFooter,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              Push notifications sent 3 days before each due date.{'\n'}Configurable in Settings.
            </Text>
          </View>
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
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backChevron: {
    transform: [{ rotate: '180deg' }],
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
  },
  plate: {
    fontSize: 11.5,
  },
  photoBanner: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  photoBannerImg: {
    width: '100%',
    height: '100%',
  },
  photoBannerEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoBannerEmptyText: {
    fontSize: 12.5,
  },
  heroCard: {
    padding: 16,
    flexDirection: 'row',
    marginBottom: 14,
  },
  vStat: {
    flex: 1,
  },
  vStatLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  vStatValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  bodyScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  label: {
    marginBottom: 10,
  },
  costCard: {
    padding: 16,
    marginBottom: 18,
  },
  costVal: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -1,
  },
  costSub: {
    fontSize: 11.5,
    marginBottom: 14,
  },
  breakdownRow: {
    marginBottom: 10,
  },
  breakdownTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  breakdownLabel: {
    fontSize: 12.5,
  },
  breakdownVal: {
    fontSize: 12,
  },
  chartCard: {
    padding: 14,
    marginBottom: 18,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 90,
    paddingHorizontal: 2,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  trendVal: {
    fontSize: 10,
  },
  trendBar: {
    width: '70%',
    borderRadius: 6,
  },
  trendLabel: {
    fontSize: 9.5,
  },
  reminderCallout: {
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  starIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionOutlineBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  actionOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listCard: {
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowDetails: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  rowVal: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  serviceCard: {
    padding: 14,
    marginBottom: 10,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  serviceCost: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  serviceNext: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  serviceNextText: {
    fontSize: 11.5,
  },
  reminderCard: {
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderDue: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  reminderFooter: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
});
