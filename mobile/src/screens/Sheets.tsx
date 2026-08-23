import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemeType } from '@/constants/theme';
import { Vehicle, rs } from '@/constants/Store';
import { Sheet, SectionLabel, Segmented, Bar } from '@/components/SharedComponents';
import { IcX, IcCamera, IcCar, CAT_ICONS } from '@/components/Icons';
import {
  VehicleInput,
  MaintenanceLogInput,
  ExpenseInput,
  ReminderInput,
  VehicleExpenseType,
  ReminderKind,
} from '@/services/api/vehicleApi';

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

  const lastOdo = vehicle && vehicle.fuel.length > 0 ? vehicle.fuel[0].odo : vehicle?.odo || 0;
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

function FormField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  theme,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  theme: ThemeType;
}) {
  return (
    <View style={styles.formField}>
      <Text
        style={[
          styles.formFieldLabel,
          {
            color: theme.dim,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.dim2}
        keyboardType={keyboardType}
        style={[
          styles.formInput,
          {
            backgroundColor: theme.glass,
            borderColor: theme.border,
            color: theme.text,
            fontFamily: theme.font,
          },
        ]}
      />
    </View>
  );
}

function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  theme,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  theme: ThemeType;
}) {
  return (
    <View style={styles.formField}>
      <Text
        style={[
          styles.formFieldLabel,
          {
            color: theme.dim,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              activeOpacity={0.8}
              style={[
                styles.pickerChip,
                {
                  backgroundColor: on ? theme.accent : theme.glass,
                  borderColor: on ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerChipText,
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
      </ScrollView>
    </View>
  );
}

function SaveButton({
  label,
  disabled,
  onPress,
  theme,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  theme: ThemeType;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.saveBtn,
        {
          backgroundColor: disabled ? theme.track : theme.accent,
        },
      ]}
    >
      <Text
        style={[
          styles.saveBtnText,
          {
            color: disabled ? theme.dim : theme.accentInk,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

async function pickVehiclePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to add a vehicle photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.4,
    base64: true,
  });
  if (result.canceled || !result.assets[0].base64) return null;
  const mime = result.assets[0].mimeType || 'image/jpeg';
  return `data:${mime};base64,${result.assets[0].base64}`;
}

function PhotoPicker({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (uri: string) => void;
  theme: ThemeType;
}) {
  const pick = async () => {
    const uri = await pickVehiclePhoto();
    if (uri) onChange(uri);
  };

  return (
    <TouchableOpacity onPress={pick} activeOpacity={0.8} style={styles.photoPickerWrapper}>
      <View
        style={[
          styles.photoPicker,
          {
            backgroundColor: theme.glass,
            borderColor: theme.border,
          },
        ]}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <IcCar size={26} stroke={theme.dim} />
          </View>
        )}
      </View>
      <View
        style={[
          styles.photoPickerBadge,
          {
            backgroundColor: theme.accent,
            borderColor: theme.sheet,
          },
        ]}
      >
        <IcCamera size={14} stroke={theme.accentInk} />
      </View>
    </TouchableOpacity>
  );
}

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];

export function AddVehicleSheet({
  open,
  onClose,
  onSave,
  vehicle,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: VehicleInput) => void;
  vehicle?: Vehicle;
  theme: ThemeType;
}) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [odo, setOdo] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      const [vMake, ...rest] = vehicle.name.split(' ');
      setMake(vMake || '');
      setModel(rest.join(' '));
      setYear(String(vehicle.year || ''));
      setPlate(vehicle.plate);
      setFuelType(vehicle.fuelType || 'Petrol');
      setOdo(String(vehicle.odo || ''));
      setPhotoUrl(vehicle.photoUrl || '');
    } else {
      setMake('');
      setModel('');
      setYear('');
      setPlate('');
      setFuelType('Petrol');
      setOdo('');
      setPhotoUrl('');
    }
  }, [open, vehicle]);

  const isFormValid = make.trim() !== '' && model.trim() !== '' && plate.trim() !== '';

  const save = () => {
    if (!isFormValid) return;
    onSave({
      make: make.trim(),
      model: model.trim(),
      year: Number(year) || 0,
      plate_number: plate.trim(),
      fuel_type: fuelType,
      odometer: Number(odo) || 0,
      photo_url: photoUrl,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={vehicle ? 'Edit vehicle' : 'Add a vehicle'} height="88%" theme={theme}>
      <View style={styles.photoRow}>
        <PhotoPicker value={photoUrl} onChange={setPhotoUrl} theme={theme} />
      </View>
      <FormField label="Make" value={make} onChange={setMake} placeholder="Toyota" theme={theme} />
      <FormField label="Model" value={model} onChange={setModel} placeholder="Aqua" theme={theme} />
      <View style={styles.gridRow}>
        <View style={styles.halfField}>
          <FormField label="Year" value={year} onChange={setYear} placeholder="2020" keyboardType="numeric" theme={theme} />
        </View>
        <View style={styles.halfField}>
          <FormField label="Plate number" value={plate} onChange={setPlate} placeholder="CAR-1234" theme={theme} />
        </View>
      </View>
      <ChipPicker
        label="Fuel type"
        options={FUEL_TYPES.map((t) => ({ value: t, label: t }))}
        value={fuelType}
        onChange={setFuelType}
        theme={theme}
      />
      <FormField label="Odometer (km)" value={odo} onChange={setOdo} placeholder="0" keyboardType="numeric" theme={theme} />
      <SaveButton label={vehicle ? 'Save changes' : 'Add vehicle'} disabled={!isFormValid} onPress={save} theme={theme} />
    </Sheet>
  );
}

export function AddMaintenanceSheet({
  open,
  onClose,
  onSave,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: MaintenanceLogInput) => void;
  theme: ThemeType;
}) {
  const [serviceName, setServiceName] = useState('');
  const [cost, setCost] = useState('');
  const [odo, setOdo] = useState('');
  const [nextDueOdo, setNextDueOdo] = useState('');

  useEffect(() => {
    if (open) {
      setServiceName('');
      setCost('');
      setOdo('');
      setNextDueOdo('');
    }
  }, [open]);

  const isFormValid = serviceName.trim() !== '' && Number(cost) > 0;

  const save = () => {
    if (!isFormValid) return;
    onSave({
      service_name: serviceName.trim(),
      cost: Number(cost),
      odometer: Number(odo) || 0,
      next_due_odometer: Number(nextDueOdo) || undefined,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log a service" height="80%" theme={theme}>
      <FormField label="Service" value={serviceName} onChange={setServiceName} placeholder="Engine oil change" theme={theme} />
      <View style={styles.gridRow}>
        <View style={styles.halfField}>
          <FormField label="Cost (LKR)" value={cost} onChange={setCost} placeholder="0" keyboardType="numeric" theme={theme} />
        </View>
        <View style={styles.halfField}>
          <FormField label="Odometer (km)" value={odo} onChange={setOdo} placeholder="0" keyboardType="numeric" theme={theme} />
        </View>
      </View>
      <FormField
        label="Next due odometer (optional, km)"
        value={nextDueOdo}
        onChange={setNextDueOdo}
        placeholder="—"
        keyboardType="numeric"
        theme={theme}
      />
      <SaveButton label="Save service" disabled={!isFormValid} onPress={save} theme={theme} />
    </Sheet>
  );
}

const EXPENSE_TYPES: { value: VehicleExpenseType; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'revenue_licence', label: 'Revenue licence' },
  { value: 'emission_test', label: 'Emission test' },
  { value: 'parking', label: 'Parking' },
  { value: 'fine', label: 'Fine' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
];

export function AddExpenseSheet({
  open,
  onClose,
  onSave,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: ExpenseInput) => void;
  theme: ThemeType;
}) {
  const [type, setType] = useState<VehicleExpenseType>('insurance');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setType('insurance');
      setAmount('');
      setNote('');
    }
  }, [open]);

  const isFormValid = Number(amount) > 0;

  const save = () => {
    if (!isFormValid) return;
    onSave({
      type,
      amount: Number(amount),
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log an expense" height="80%" theme={theme}>
      <ChipPicker label="Type" options={EXPENSE_TYPES} value={type} onChange={setType} theme={theme} />
      <FormField label="Amount (LKR)" value={amount} onChange={setAmount} placeholder="0" keyboardType="numeric" theme={theme} />
      <FormField label="Note (optional)" value={note} onChange={setNote} placeholder="What was this for?" theme={theme} />
      <SaveButton label="Save expense" disabled={!isFormValid} onPress={save} theme={theme} />
    </Sheet>
  );
}

const REMINDER_KINDS: { value: ReminderKind; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'revenue_licence', label: 'Revenue licence' },
  { value: 'emission_test', label: 'Emission test' },
  { value: 'service', label: 'Service' },
  { value: 'custom', label: 'Custom' },
];

export function AddReminderSheet({
  open,
  onClose,
  onSave,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: ReminderInput) => void;
  theme: ThemeType;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ReminderKind>('custom');
  const [daysUntilDue, setDaysUntilDue] = useState('');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState('3');

  useEffect(() => {
    if (open) {
      setTitle('');
      setKind('custom');
      setDaysUntilDue('');
      setNotifyDaysBefore('3');
    }
  }, [open]);

  const isFormValid = title.trim() !== '';

  const save = () => {
    if (!isFormValid) return;
    const days = Number(daysUntilDue);
    const dueDate = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : undefined;
    onSave({
      title: title.trim(),
      kind,
      due_date: dueDate,
      notify_days_before: Number(notifyDaysBefore) || 3,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add a reminder" height="84%" theme={theme}>
      <FormField label="Title" value={title} onChange={setTitle} placeholder="Insurance renewal" theme={theme} />
      <ChipPicker label="Kind" options={REMINDER_KINDS} value={kind} onChange={setKind} theme={theme} />
      <View style={styles.gridRow}>
        <View style={styles.halfField}>
          <FormField label="Due in (days)" value={daysUntilDue} onChange={setDaysUntilDue} placeholder="7" keyboardType="numeric" theme={theme} />
        </View>
        <View style={styles.halfField}>
          <FormField label="Notify before (days)" value={notifyDaysBefore} onChange={setNotifyDaysBefore} placeholder="3" keyboardType="numeric" theme={theme} />
        </View>
      </View>
      <SaveButton label="Save reminder" disabled={!isFormValid} onPress={save} theme={theme} />
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
  formField: {
    marginBottom: 14,
  },
  formFieldLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  formInput: {
    width: '100%',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  halfField: {
    flex: 1,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  photoRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  photoPickerWrapper: {
    width: 96,
    height: 96,
  },
  photoPicker: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
