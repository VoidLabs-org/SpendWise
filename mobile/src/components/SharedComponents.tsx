import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Platform,
  ViewStyle,
  TextStyle,
  Modal,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeType, SCREEN_HEIGHT } from '@/constants/theme';
import { signRs } from '@/constants/Store';
import { IcX, IcHome, IcList, IcPlus, IcCar, IcChart, IconProps } from './Icons';

interface SharedProps {
  theme: ThemeType;
}

export const GlassCard = ({
  children,
  style,
  onClick,
  glow,
  theme,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onClick?: () => void;
  glow?: boolean;
  theme: ThemeType;
}) => {
  const CardContainer = onClick ? TouchableOpacity : View;

  return (
    <CardContainer
      onPress={onClick}
      activeOpacity={0.8}
      style={[
        styles.glassCard,
        {
          backgroundColor: theme.glass,
          borderColor: glow ? theme.heroBorder : theme.border,
        },
        theme.cardShadow,
        style,
      ]}
    >
      {children}
    </CardContainer>
  );
};

export const SectionLabel = ({
  children,
  style,
  theme,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  theme: ThemeType;
}) => (
  <Text
    style={[
      styles.sectionLabel,
      {
        color: theme.dim,
        fontFamily: theme.fontBold,
      },
      style,
    ]}
  >
    {children.toUpperCase()}
  </Text>
);

export const IconBtn = ({
  children,
  onClick,
  active,
  size = 40,
  theme,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  size?: number;
  theme: ThemeType;
  style?: StyleProp<ViewStyle>;
}) => (
  <TouchableOpacity
    onPress={onClick}
    activeOpacity={0.7}
    disabled={!onClick}
    style={[
      styles.iconBtn,
      {
        width: size,
        height: size,
        borderRadius: 13,
        backgroundColor: active ? theme.accentDim : theme.glass,
        borderColor: active ? 'rgba(199,249,75,0.3)' : theme.border,
      },
      style,
    ]}
  >
    {React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child as any, {
            stroke: active ? theme.accent : theme.text,
          })
        : child
    )}
  </TouchableOpacity>
);

export const Toggle = ({
  on,
  onClick,
  theme,
}: {
  on: boolean;
  onClick: () => void;
  theme: ThemeType;
}) => (
  <TouchableOpacity
    onPress={onClick}
    activeOpacity={0.8}
    style={[
      styles.toggleTrack,
      {
        backgroundColor: on ? theme.accent : theme.track,
        alignItems: on ? 'flex-end' : 'flex-start',
      },
    ]}
  >
    <View
      style={[
        styles.toggleThumb,
        {
          backgroundColor: on ? theme.accentInk : theme.strong,
        },
      ]}
    />
  </TouchableOpacity>
);

export const Chip = ({
  children,
  active,
  onClick,
  theme,
}: {
  children: string;
  active?: boolean;
  onClick: () => void;
  theme: ThemeType;
}) => (
  <TouchableOpacity
    onPress={onClick}
    activeOpacity={0.8}
    style={[
      styles.chip,
      {
        backgroundColor: active ? theme.accent : theme.glass,
        borderColor: active ? theme.accent : theme.border,
      },
    ]}
  >
    <Text
      style={[
        styles.chipText,
        {
          color: active ? theme.accentInk : theme.dim,
          fontFamily: theme.fontBold,
        },
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

export const Segmented = ({
  options,
  value,
  onChange,
  theme,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  theme: ThemeType;
}) => (
  <View
    style={[
      styles.segmented,
      {
        backgroundColor: theme.glass,
        borderColor: theme.border,
      },
    ]}
  >
    {options.map((o) => {
      const on = o.value === value;
      return (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          activeOpacity={0.8}
          style={[
            styles.segmentedBtn,
            {
              backgroundColor: on ? theme.accent : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.segmentedText,
              {
                color: on ? theme.accentInk : theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const Bar = ({
  pct,
  color,
  h = 5,
  theme,
}: {
  pct: number;
  color?: string;
  h?: number;
  theme: ThemeType;
}) => (
  <View
    style={[
      styles.barTrack,
      {
        height: h,
        borderRadius: h,
        backgroundColor: theme.track,
      },
    ]}
  >
    <View
      style={[
        styles.barFill,
        {
          width: `${Math.min(100, pct * 100)}%`,
          height: '100%',
          borderRadius: h,
          backgroundColor: color || theme.accent,
        },
      ]}
    />
  </View>
);

export const TxRow = ({
  icon: IconComp,
  iconColor,
  title,
  sub,
  amount,
  onClick,
  last,
  theme,
}: {
  icon: React.ComponentType<IconProps>;
  iconColor?: string;
  title: string;
  sub?: string;
  amount?: number;
  onClick?: () => void;
  last?: string;
  theme: ThemeType;
}) => {
  const RowContainer = onClick ? TouchableOpacity : View;

  return (
    <RowContainer
      onPress={onClick}
      activeOpacity={0.8}
      style={[
        styles.txRow,
        {
          borderTopColor: theme.border,
          borderTopWidth: last === 'first' ? 0 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.txRowIconContainer,
          {
            backgroundColor: theme.glass,
            borderColor: theme.border,
          },
        ]}
      >
        <IconComp size={18} stroke={iconColor || theme.dim} />
      </View>
      <View style={styles.txRowText}>
        <Text
          numberOfLines={1}
          style={[
            styles.txRowTitle,
            {
              color: theme.text,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          {title}
        </Text>
        {sub && (
          <Text
            numberOfLines={1}
            style={[
              styles.txRowSub,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            {sub}
          </Text>
        )}
      </View>
      {amount != null && (
        <Text
          style={[
            styles.txRowAmount,
            {
              color: amount > 0 ? theme.accent : theme.text,
              fontFamily: theme.monoBold,
            },
          ]}
        >
          {signRs(amount)}
        </Text>
      )}
    </RowContainer>
  );
};

export const Sheet = ({
  open,
  onClose,
  title,
  children,
  height = '80%',
  theme,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: string | number;
  theme: ThemeType;
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open]);

  if (!open) return null;

  return (
    <Modal transparent visible={open} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdropPressable} onPress={onClose}>
          <Animated.View
            style={[
              styles.sheetBackdrop,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.sheetContent,
            {
              height: height as any,
              backgroundColor: theme.sheet,
              borderColor: theme.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* handle */}
          <View style={styles.sheetHandleContainer}>
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: theme.dim2,
                },
              ]}
            />
          </View>
          {/* header */}
          <View style={styles.sheetHeader}>
            <Text
              style={[
                styles.sheetTitle,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {title}
            </Text>
            <IconBtn size={32} onClick={onClose} theme={theme}>
              <IcX size={17} />
            </IconBtn>
          </View>
          {/* body */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetBody}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const AppTabBar = ({
  active,
  onChange,
  onAdd,
  theme,
}: {
  active: string;
  onChange: (tab: string) => void;
  onAdd: () => void;
  theme: ThemeType;
}) => {
  const tabs = [
    { key: 'home', label: 'Home', Icon: IcHome },
    { key: 'spending', label: 'Spending', Icon: IcList },
    { key: '__add', label: '', Icon: IcPlus },
    { key: 'vehicles', label: 'Vehicles', Icon: IcCar },
    { key: 'reports', label: 'Reports', Icon: IcChart },
  ];

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        if (tab.key === '__add') {
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={onAdd}
              activeOpacity={0.8}
              style={[
                styles.tabBarAdd,
                {
                  backgroundColor: theme.accent,
                },
                theme.fabShadow,
              ]}
            >
              <IcPlus size={26} stroke={theme.accentInk} sw={2.6} />
            </TouchableOpacity>
          );
        }

        const isSelected = active === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
            style={styles.tabBarItem}
          >
            <tab.Icon
              size={22}
              stroke={isSelected ? theme.accent : theme.dim2}
              sw={isSelected ? 2.1 : 1.8}
            />
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: isSelected ? theme.accent : theme.dim2,
                  fontFamily: theme.font,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 99,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 13,
    padding: 3,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txRowIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txRowText: {
    flex: 1,
    justifyContent: 'center',
  },
  txRowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  txRowSub: {
    fontSize: 11.5,
  },
  txRowAmount: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 99,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  sheetBody: {
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  tabBarItem: {
    alignItems: 'center',
    width: 56,
  },
  tabBarLabel: {
    fontSize: 10,
    marginTop: 5,
  },
  tabBarAdd: {
    width: 52,
    height: 52,
    borderRadius: 17,
    marginTop: -38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
