import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { Transaction } from '@/constants/Store';
import { SectionLabel, Segmented, IconBtn } from '@/components/SharedComponents';
import { IcChevron, IcTrash, CAT_ICONS } from '@/components/Icons';
import { Keypad, fmtAmt } from './Sheets';

export function ScreenTxnDetail({
  theme,
  tx,
  onBack,
  onSave,
  onDelete,
}: {
  theme: ThemeType;
  tx: Transaction;
  onBack: () => void;
  onSave: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const initType = tx.amount > 0 ? 'income' : 'expense';
  const [type, setType] = useState<'expense' | 'income'>(initType);
  const [amt, setAmt] = useState(String(Math.abs(tx.amount)));
  const [cat, setCat] = useState(tx.cat);
  const [note, setNote] = useState(tx.note || '');

  const press = (k: string) => {
    setAmt((p) => {
      if (k === 'del') return p.slice(0, -1);
      if (k === '.') return p.includes('.') ? p : (p || '0') + '.';
      if (p.replace('.', '').length >= 9) return p;
      return p + k;
    });
  };

  const catList = type === 'income' ? ['Income'] : ['Food', 'Fuel', 'Shopping', 'Bills', 'Entertainment', 'Health'];
  const changed = Number(amt) !== Math.abs(tx.amount) || cat !== tx.cat || type !== initType || note !== (tx.note || '');

  const save = () => {
    const v = Number(amt) || 0;
    if (v <= 0) return;
    onSave({
      ...tx,
      amount: type === 'income' ? v : -v,
      cat: type === 'income' ? 'Income' : cat,
      name: type === 'income' && tx.cat !== 'Income' ? 'Income' : tx.name,
      note,
    });
    onBack();
  };

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
                styles.title,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {tx.name}
            </Text>
            <Text
              style={[
                styles.date,
                {
                  color: theme.dim,
                  fontFamily: theme.font,
                },
              ]}
            >
              {tx.when}
            </Text>
          </View>
          <IconBtn
            size={38}
            onClick={() => {
              onDelete(tx.id);
              onBack();
            }}
            theme={theme}
          >
            <IcTrash size={18} stroke={theme.warn} />
          </IconBtn>
        </View>
      </View>

      {/* body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.segmentedWrapper}>
          <Segmented
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={type}
            onChange={(v) => {
              const selectedType = v as 'expense' | 'income';
              setType(selectedType);
              setCat(selectedType === 'income' ? 'Income' : tx.cat === 'Income' ? 'Food' : tx.cat);
            }}
            theme={theme}
          />
        </View>

        {/* amount */}
        <View style={styles.amtBox}>
          <Text
            style={[
              styles.amtLabel,
              {
                color: theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            AMOUNT (LKR)
          </Text>
          <Text
            style={[
              styles.amtVal,
              {
                color: type === 'income' ? theme.accent : theme.strong,
                fontFamily: theme.monoBold,
              },
            ]}
          >
            <Text style={styles.amtSymbol}>Rs</Text>
            {fmtAmt(amt)}
          </Text>
        </View>

        {/* category selection */}
        <SectionLabel style={styles.label} theme={theme}>
          Category
        </SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
          style={styles.catWrapper}
        >
          {catList.map((c) => {
            const meta = CAT_ICONS[c] || CAT_ICONS.Shopping;
            const on = cat === c;

            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCat(c)}
                activeOpacity={0.8}
                style={styles.catBtn}
              >
                <View
                  style={[
                    styles.catIconContainer,
                    {
                      backgroundColor: on ? theme.accentDim : theme.glass,
                      borderColor: on ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <meta.Icon size={22} stroke={on ? theme.accent : meta.color} />
                </View>
                <Text
                  style={[
                    styles.catLabel,
                    {
                      color: on ? theme.text : theme.dim,
                      fontFamily: on ? theme.fontBold : theme.font,
                    },
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* note input */}
        <SectionLabel style={styles.label} theme={theme}>
          Note
        </SectionLabel>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          placeholderTextColor={theme.dim2}
          style={[
            styles.noteInput,
            {
              backgroundColor: theme.glass,
              borderColor: theme.border,
              color: theme.text,
              fontFamily: theme.font,
            },
          ]}
        />

        <View style={styles.keypadWrapper}>
          <Keypad onKey={press} theme={theme} />
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={!changed}
          activeOpacity={0.8}
          style={[
            styles.saveBtn,
            {
              backgroundColor: changed ? theme.accent : theme.track,
            },
          ]}
        >
          <Text
            style={[
              styles.saveBtnText,
              {
                color: changed ? theme.accentInk : theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {changed ? 'Save changes' : 'No changes'}
          </Text>
        </TouchableOpacity>
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
  },
  backChevron: {
    transform: [{ rotate: '180deg' }],
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  date: {
    fontSize: 11.5,
    marginTop: 2,
  },
  bodyScroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  segmentedWrapper: {
    marginBottom: 16,
  },
  amtBox: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 16,
  },
  amtLabel: {
    fontSize: 11.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amtVal: {
    fontSize: 44,
    fontWeight: '600',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  amtSymbol: {
    fontSize: 22,
    marginRight: 4,
  },
  label: {
    marginBottom: 10,
  },
  catWrapper: {
    marginHorizontal: -18,
    marginBottom: 16,
  },
  catScroll: {
    paddingHorizontal: 18,
    paddingBottom: 6,
    gap: 8,
    flexDirection: 'row',
  },
  catBtn: {
    width: 64,
    alignItems: 'center',
    gap: 6,
  },
  catIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 10.5,
  },
  noteInput: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14.5,
    marginBottom: 18,
  },
  keypadWrapper: {
    marginBottom: 16,
  },
  saveBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
});
