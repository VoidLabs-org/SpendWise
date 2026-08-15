import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { Vehicle, rs } from '@/constants/Store';
import { Sheet, SectionLabel, Segmented, Bar } from '@/components/SharedComponents';
import { IcX, CAT_ICONS } from '@/components/Icons';

export function Keypad({
  onKey,
  theme,
}: {
  onKey: (key: string) => void;
  theme: ThemeType;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

  return (
    <View style={styles.grid}>
      {keys.map((k) => (
        <TouchableOpacity
          key={k}
          onPress={() => onKey(k)}
          activeOpacity={0.7}
          style={[
            styles.keyBtn,
            {
              backgroundColor: theme.glass,
              borderColor: theme.border,
            },
          ]}
        >
          {k === 'del' ? (
            <IcX size={20} stroke={theme.text} />
          ) : (
            <Text
              style={[
                styles.keyText,
                {
                  color: theme.text,
                  fontFamily: theme.mono,
                },
              ]}
            >
              {k}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const fmtAmt = (s: string) => {
  if (!s) return '0';
  const [a, b] = s.split('.');
  const n = Number(a).toLocaleString('en-US');
  return b !== undefined ? `${n}.${b}` : n;
};

export function AddTransactionSheet({
  open,
  onClose,
  onSave,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (tx: any) => void;
  theme: ThemeType;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState('Food');

  useEffect(() => {
    if (open) {
      setType('expense');
      setAmt('');
      setCat('Food');
    }
  }, [open]);

  const press = (k: string) => {
    setAmt((p) => {
      if (k === 'del') return p.slice(0, -1);
      if (k === '.' && p.includes('.')) return p;
      if (k === '.' && !p) return '0.';
      if (p.replace('.', '').length >= 9) return p;
      return p + k;
    });
  };

  const catList = type === 'income' ? ['Income'] : ['Food', 'Fuel', 'Shopping', 'Bills', 'Entertainment', 'Health'];

  const save = () => {
    const v = Number(amt) || 0;
    if (v <= 0) return;
    onSave({
      id: 't' + Date.now(),
      name: type === 'income' ? 'Income' : cat,
      cat: type === 'income' ? 'Income' : cat,
      amount: type === 'income' ? v : -v,
      when: 'Just now',
      day: 'Today',
      note: 'Added just now',
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add transaction" height="88%" theme={theme}>
      <View style={styles.segmentedWrapper}>
        <Segmented
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={type}
          onChange={(v) => {
            const t = v as 'expense' | 'income';
            setType(t);
            setCat(t === 'income' ? 'Income' : 'Food');
          }}
          theme={theme}
        />
      </View>

      {/* amount display */}
      <View style={styles.amtBox}>
        <Text
          style={[
            styles.amtLabel,
            {
              color: theme.dim,
              fontFamily: theme.font,
            },
          ]}
        >
          AMOUNT (LKR)
        </Text>
        <Text
          style={[
            styles.amtVal,
            {
              color: amt ? (type === 'income' ? theme.accent : theme.strong) : theme.dim2,
              fontFamily: theme.monoBold,
            },
          ]}
        >
          <Text style={styles.amtSymbol}>Rs</Text>
          {fmtAmt(amt)}
        </Text>
      </View>

      {/* categories */}
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
                    borderColor: on ? 'rgba(199,249,75,0.4)' : theme.border,
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

      <View style={styles.keypadWrapper}>
        <Keypad onKey={press} theme={theme} />
      </View>

      <TouchableOpacity
        onPress={save}
        disabled={Number(amt) <= 0}
        activeOpacity={0.8}
        style={[
          styles.saveBtn,
          {
            backgroundColor: Number(amt) > 0 ? theme.accent : theme.track,
          },
        ]}
      >
        <Text
          style={[
            styles.saveBtnText,
            {
              color: Number(amt) > 0 ? theme.accentInk : theme.dim,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          Save transaction
        </Text>
      </TouchableOpacity>
    </Sheet>
  );
}

export function AddFuelSheet({
  open,
  onClose,
  onSave,
  vehicle,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (entry: any) => void;
  vehicle: Vehicle | undefined;
  theme: ThemeType;
}) {
  const [field, setField] = useState<'litres' | 'cost' | 'odo'>('cost');
  const [vals, setVals] = useState({ litres: '', cost: '', odo: '' });

  useEffect(() => {
    if (open) {
      setField('cost');
      setVals({ litres: '', cost: '', odo: '' });
    }
  }, [open]);

  const press = (k: string) => {
    setVals((p) => {
      let cur = p[field];
      if (k === 'del') {
        cur = cur.slice(0, -1);
      } else if (k === '.') {
        cur = cur.includes('.') ? cur : (cur || '0') + '.';
      } else if (cur.replace('.', '').length < 8) {
        cur = cur + k;
      }
      return { ...p, [field]: cur };
    });
  };

  const lastOdo = vehicle ? vehicle.fuel[0].odo : 0;
  const dist = Number(vals.odo) - lastOdo;
  const eff =
    dist > 0 && Number(vals.litres) > 0 ? (dist / Number(vals.litres)).toFixed(1) : null;

  const fieldRow = (key: 'litres' | 'cost' | 'odo', label: string, prefix: string) => {
    const isSelected = field === key;
    return (
      <TouchableOpacity
        onPress={() => setField(key)}
        activeOpacity={0.8}
        style={[
          styles.fieldCard,
          {
            backgroundColor: isSelected ? theme.accentDim : theme.glass,
            borderColor: isSelected ? 'rgba(199,249,75,0.4)' : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.fieldLabel,
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
            styles.fieldVal,
            {
              color: vals[key] ? theme.strong : theme.dim2,
              fontFamily: theme.mono,
            },
          ]}
        >
          {prefix}
          {vals[key] ? fmtAmt(vals[key]) : '0'}
        </Text>
      </TouchableOpacity>
    );
  };

  const save = () => {
    if (!(Number(vals.litres) > 0 && Number(vals.cost) > 0)) return;
    onSave({
      id: 'f' + Date.now(),
      when: 'Today',
      litres: Number(vals.litres),
      cost: Number(vals.cost),
      odo: Number(vals.odo) || lastOdo,
      eff: eff ? Number(eff) : vehicle?.eff || 0,
      station: 'New entry',
    });
    onClose();
  };

  const isFormValid = Number(vals.litres) > 0 && Number(vals.cost) > 0;

  return (
    <Sheet open={open} onClose={onClose} title="Log a fill-up" height="84%" theme={theme}>
      <View style={styles.gridRow}>
        {fieldRow('litres', 'LITRES', '')}
        {fieldRow('cost', 'COST', 'Rs ')}
      </View>
      <View style={styles.gridRow}>
        {fieldRow('odo', 'ODOMETER (KM)', '')}
        <View style={[styles.fieldCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <Text
            style={[
              styles.fieldLabel,
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
              styles.fieldVal,
              {
                color: eff ? theme.accent : theme.dim2,
                fontFamily: theme.mono,
              },
            ]}
          >
            {eff ? eff + ' km/L' : '—'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.odoLabel,
          {
            color: theme.dim,
            fontFamily: theme.mono,
          },
        ]}
      >
        Last odometer: {lastOdo.toLocaleString()} km
      </Text>

      <View style={styles.keypadWrapper}>
        <Keypad onKey={press} theme={theme} />
      </View>

      <TouchableOpacity
        onPress={save}
        disabled={!isFormValid}
        activeOpacity={0.8}
        style={[
          styles.saveBtn,
          {
            backgroundColor: isFormValid ? theme.accent : theme.track,
          },
        ]}
      >
        <Text
          style={[
            styles.saveBtnText,
            {
              color: isFormValid ? theme.accentInk : theme.dim,
              fontFamily: theme.fontBold,
            },
          ]}
        >
          Save fill-up
        </Text>
      </TouchableOpacity>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: '31%',
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  keyText: {
    fontSize: 21,
    fontWeight: '500',
  },
  segmentedWrapper: {
    marginBottom: 16,
  },
  amtBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 18,
  },
  amtLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  amtVal: {
    fontSize: 46,
    fontWeight: '600',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  amtSymbol: {
    fontSize: 24,
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
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  fieldCard: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldVal: {
    fontSize: 17,
    fontWeight: '500',
  },
  odoLabel: {
    fontSize: 11,
    marginBottom: 14,
  },
});
