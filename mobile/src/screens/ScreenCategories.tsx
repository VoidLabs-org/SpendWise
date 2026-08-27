import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { GlassCard, SectionLabel, IconBtn, Toggle } from '@/components/SharedComponents';
import { IcChevron, IcPlus, CAT_ICONS } from '@/components/Icons';
import { BackendCategory } from '@/services/api/financeApi';

export function ScreenCategories({
  theme,
  categories,
  onToggleArchived,
  onAddCategory,
  onBack,
}: {
  theme: ThemeType;
  categories: BackendCategory[];
  onToggleArchived: (id: string, archived: boolean) => void;
  onAddCategory: () => void;
  onBack: () => void;
}) {
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  const renderRow = (c: BackendCategory) => {
    const meta = CAT_ICONS[c.name] || CAT_ICONS.Shopping;
    const isDefault = !c.user_id;

    return (
      <GlassCard key={c.id} style={styles.row} theme={theme}>
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
            {c.name}
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
            {isDefault ? 'Default category' : c.archived ? 'Archived' : 'Custom category'}
          </Text>
        </View>
        {!isDefault && (
          <Toggle on={!c.archived} onClick={() => onToggleArchived(c.id, !c.archived)} theme={theme} />
        )}
      </GlassCard>
    );
  };

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
            Categories
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyScroll}>
        <SectionLabel style={styles.label} theme={theme}>{`Active · ${active.length}`}</SectionLabel>
        {active.map(renderRow)}

        {archived.length > 0 && (
          <>
            <SectionLabel style={styles.label} theme={theme}>{`Archived · ${archived.length}`}</SectionLabel>
            {archived.map(renderRow)}
          </>
        )}

        {/* add category */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAddCategory}
          style={[
            styles.addCard,
            {
              borderColor: theme.border2,
            },
          ]}
        >
          <View
            style={[
              styles.addIconContainer,
              {
                backgroundColor: theme.accentDim,
              },
            ]}
          >
            <IcPlus size={18} stroke={theme.accent} />
          </View>
          <Text
            style={[
              styles.addText,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Add a category
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.footerNotice,
            {
              color: theme.dim,
              fontFamily: theme.font,
            },
          ]}
        >
          Default categories can't be archived. Archiving a custom category hides it from new
          transactions without deleting its past history.
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
  label: {
    marginBottom: 12,
    marginTop: 8,
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
  addCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  addIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  footerNotice: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
