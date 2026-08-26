import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { IcSearch, IcX, IcChevron, IconProps } from './Icons';

export interface SearchItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<IconProps>;
  keywords?: string[];
  onSelect: () => void;
}

/** A Spotlight-style command palette: type to filter every navigable screen and quick action
 * in the app, tap a result to jump straight there. */
export function SearchModal({
  open,
  onClose,
  items,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
  theme: ThemeType;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.subtitle?.toLowerCase().includes(q) ||
          it.keywords?.some((k) => k.toLowerCase().includes(q))
      )
    : items;

  const select = (it: SearchItem) => {
    onClose();
    it.onSelect();
  };

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.glass,
                borderColor: theme.border,
              },
            ]}
          >
            <IcSearch size={18} stroke={theme.dim} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search SpendWise..."
              placeholderTextColor={theme.dim2}
              style={[
                styles.input,
                {
                  color: theme.text,
                  fontFamily: theme.font,
                },
              ]}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <IcX size={16} stroke={theme.dim} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.results}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text
                style={[
                  styles.empty,
                  {
                    color: theme.dim,
                    fontFamily: theme.font,
                  },
                ]}
              >
                No results for &ldquo;{query}&rdquo;
              </Text>
            ) : (
              filtered.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => select(it)}
                  activeOpacity={0.7}
                  style={styles.row}
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
                    <it.icon size={17} stroke={theme.dim} />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowLabel,
                        {
                          color: theme.text,
                          fontFamily: theme.fontBold,
                        },
                      ]}
                    >
                      {it.label}
                    </Text>
                    {it.subtitle && (
                      <Text
                        style={[
                          styles.rowSub,
                          {
                            color: theme.dim,
                            fontFamily: theme.font,
                          },
                        ]}
                      >
                        {it.subtitle}
                      </Text>
                    )}
                  </View>
                  <IcChevron size={16} stroke={theme.dim2} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  results: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14.5,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
