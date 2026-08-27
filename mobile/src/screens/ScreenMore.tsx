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
import { StoreType } from '@/constants/Store';
import { GlassCard, SectionLabel, IconBtn, Toggle } from '@/components/SharedComponents';
import {
  IcChevron,
  IcEdit,
  IcMoon,
  IcLock,
  IcBell,
  IcGlobe,
  IcList,
  IcChart,
  IcArrowUp,
  IcDownload,
  IcShield,
  IcTrash,
  IconProps,
} from '@/components/Icons';

function SettingRow({
  icon: IconComp,
  label,
  detail,
  toggle,
  onToggle,
  onClick,
  color,
  last,
  theme,
}: {
  icon: React.ComponentType<IconProps>;
  label: string;
  detail?: string;
  toggle?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  color?: string;
  last?: string;
  theme: ThemeType;
}) {
  const RowContainer = onClick ? TouchableOpacity : View;

  return (
    <RowContainer
      onPress={onClick}
      activeOpacity={0.8}
      style={[
        styles.rowContainer,
        {
          borderTopColor: theme.border,
          borderTopWidth: last === 'first' ? 0 : 1,
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
        <IconComp size={17} stroke={color || theme.dim} />
      </View>
      <Text
        style={[
          styles.rowLabel,
          {
            color: theme.text,
            fontFamily: theme.font,
          },
        ]}
      >
        {label}
      </Text>
      {toggle !== undefined ? (
        <Toggle on={toggle} onClick={onToggle || (() => {})} theme={theme} />
      ) : (
        <View style={styles.rowRight}>
          {detail ? (
            <Text
              style={[
                styles.rowDetail,
                {
                  color: theme.dim,
                  fontFamily: theme.mono,
                },
              ]}
            >
              {detail}
            </Text>
          ) : null}
          <IcChevron size={14} stroke={theme.dim2} />
        </View>
      )}
    </RowContainer>
  );
}

export function ScreenMore({
  theme,
  store,
  themeMode,
  onToggleTheme,
  onOpenBudgets,
  onOpenCategories,
  onLogout,
  defaultRollover,
  onToggleDefaultRollover,
  activeCategoryCount,
  userEmail,
  photoUri,
  language,
  currency,
  onEditProfile,
  onEditLanguage,
  onEditCurrency,
}: {
  theme: ThemeType;
  store: StoreType;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenBudgets: () => void;
  onOpenCategories: () => void;
  onLogout: () => void;
  defaultRollover: boolean;
  onToggleDefaultRollover: () => void;
  activeCategoryCount: number;
  userEmail: string;
  photoUri: string;
  language: string;
  currency: string;
  onEditProfile: () => void;
  onEditLanguage: () => void;
  onEditCurrency: () => void;
}) {
  const [bio, setBio] = useState(true);
  const [notif, setNotif] = useState(true);

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
          Settings
        </Text>
      </View>

      {/* profile */}
      <GlassCard style={styles.profileCard} theme={theme}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[styles.avatar, { borderColor: theme.accent }]} />
        ) : (
          <View
            style={[
              styles.avatar,
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
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text
            style={[
              styles.profileName,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {store.user}
          </Text>
          <Text
            style={[
              styles.profileSub,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            {userEmail ? `${userEmail} · ${currency}` : currency}
          </Text>
        </View>
        <IconBtn size={36} onClick={onEditProfile} theme={theme}>
          <IcEdit size={17} />
        </IconBtn>
      </GlassCard>

      {/* premium banner */}
      <View
        style={[
          styles.premiumCard,
          {
            backgroundColor: theme.premiumBg || theme.glass,
            borderColor: theme.premiumBorder || theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.premiumTitle,
            {
              color: theme.text,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          SpendWise Premium
        </Text>
        <Text
          style={[
            styles.premiumDesc,
            {
              color: theme.dim,
              fontFamily: theme.font,
            },
          ]}
        >
          Unlimited vehicles, AI insights, multi-currency, cloud backup & no ads.
        </Text>
        <View style={styles.premiumFooter}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.premiumBtn,
              {
                backgroundColor: theme.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.premiumBtnText,
                {
                  color: theme.accentInk,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Go Premium
            </Text>
          </TouchableOpacity>
          <Text
            style={[
              styles.premiumPrice,
              {
                color: theme.dim,
                fontFamily: theme.mono,
              },
            ]}
          >
            Rs 290/mo
          </Text>
        </View>
      </View>

      <SectionLabel style={styles.sectionLabel} theme={theme}>
        App
      </SectionLabel>
      <GlassCard style={styles.groupCard} theme={theme}>
        <SettingRow
          icon={IcMoon}
          label="Dark mode"
          toggle={themeMode === 'dark'}
          onToggle={onToggleTheme}
          color={theme.accent}
          last="first"
          theme={theme}
        />
        <SettingRow
          icon={IcLock}
          label="Biometric lock"
          toggle={bio}
          onToggle={() => setBio(!bio)}
          theme={theme}
        />
        <SettingRow
          icon={IcBell}
          label="Notifications"
          toggle={notif}
          onToggle={() => setNotif(!notif)}
          theme={theme}
        />
        <SettingRow icon={IcGlobe} label="Language" detail={language} onClick={onEditLanguage} theme={theme} />
      </GlassCard>

      <SectionLabel style={styles.sectionLabel} theme={theme}>
        Money
      </SectionLabel>
      <GlassCard style={styles.groupCard} theme={theme}>
        <SettingRow
          icon={IcList}
          label="Categories"
          detail={`${activeCategoryCount}`}
          onClick={onOpenCategories}
          last="first"
          theme={theme}
        />
        <SettingRow
          icon={IcChart}
          label="Budgets"
          detail={`${store.budgets.length} set`}
          onClick={onOpenBudgets}
          theme={theme}
        />
        <SettingRow
          icon={IcArrowUp}
          label="Budget rollover"
          toggle={defaultRollover}
          onToggle={onToggleDefaultRollover}
          theme={theme}
        />
        <SettingRow icon={IcGlobe} label="Base currency" detail={currency} onClick={onEditCurrency} theme={theme} />
      </GlassCard>

      <SectionLabel style={styles.sectionLabel} theme={theme}>
        Data
      </SectionLabel>
      <GlassCard style={styles.groupCard} theme={theme}>
        <SettingRow
          icon={IcDownload}
          label="Export to CSV"
          detail="Premium"
          color={theme.dim}
          last="first"
          theme={theme}
        />
        <SettingRow
          icon={IcShield}
          label="Cloud backup"
          detail="Premium"
          color={theme.dim}
          theme={theme}
        />
        <SettingRow
          icon={IcTrash}
          label="Clear all data"
          color={theme.warn}
          theme={theme}
        />
      </GlassCard>

      <TouchableOpacity
        onPress={onLogout}
        activeOpacity={0.8}
        style={[
          styles.logoutBtn,
          {
            backgroundColor: theme.glass,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.logoutBtnText,
            {
              color: theme.warn,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          Log out
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.footerVersion,
          {
            color: theme.dim2,
            fontFamily: theme.mono,
          },
        ]}
      >
        SpendWise v1.0.0 · MVP
      </Text>
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
  profileCard: {
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  premiumCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 22,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  premiumDesc: {
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  premiumFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  premiumPrice: {
    fontSize: 12.5,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  groupCard: {
    marginBottom: 18,
    paddingVertical: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14.5,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowDetail: {
    fontSize: 13,
    marginRight: 2,
  },
  logoutBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  footerVersion: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
  },
});
