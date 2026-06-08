import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { StoreType, Vehicle, rs } from '@/constants/Store';
import { GlassCard, SectionLabel } from '@/components/SharedComponents';
import { IcCar, IcChevron, IcLock } from '@/components/Icons';

export function ScreenVehicles({
  theme,
  store,
  onOpenVehicle,
}: {
  theme: ThemeType;
  store: StoreType;
  onOpenVehicle: (id: string) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          Vehicles
        </Text>
      </View>

      {store.vehicles.map(v => (
        <GlassCard
          key={v.id}
          glow={v.primary}
          style={styles.vehicleCard}
          onClick={() => onOpenVehicle(v.id)}
          theme={theme}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.border,
                },
              ]}
            >
              <IcCar size={24} stroke={v.tone} />
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
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
                {v.primary && (
                  <View
                    style={[
                      styles.primaryBadge,
                      {
                        backgroundColor: theme.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryBadgeText,
                        {
                          color: theme.accentInk,
                          fontFamily: theme.fontBold,
                        },
                      ]}
                    >
                      PRIMARY
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.details,
                  {
                    color: theme.dim,
                    fontFamily: theme.mono,
                  },
                ]}
              >
                {v.plate} · {v.year} · {v.fuelType}
              </Text>
            </View>
            <IcChevron size={16} stroke={theme.dim} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                ODOMETER
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {v.odo.toLocaleString()} km
              </Text>
            </View>
            <View style={[styles.stat, styles.statBorder, { borderColor: theme.border }]}>
              <Text
                style={[
                  styles.statLabel,
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
                  styles.statValue,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {v.eff} km/L
              </Text>
            </View>
            <View style={[styles.stat, styles.statBorder, { borderColor: theme.border }]}>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                THIS MONTH
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.strong,
                    fontFamily: theme.monoBold,
                  },
                ]}
              >
                {rs(v.spend)}
              </Text>
            </View>
          </View>
        </GlassCard>
      ))}

      {/* premium add */}
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
          <IcLock size={18} stroke={theme.dim} />
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
            Add another vehicle
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
            Unlimited vehicles with Premium
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.upgradeBtn,
            {
              borderColor: 'rgba(199,249,75,0.3)',
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
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  vehicleCard: {
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  primaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  details: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statBorder: {
    borderLeftWidth: 1,
    paddingLeft: 12,
  },
  statLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  premiumAdd: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  lockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 14,
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
});
