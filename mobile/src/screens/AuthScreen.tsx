import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { IconBtn } from '@/components/SharedComponents';
import { IcEye, IcEyeOff, IcLock } from '@/components/Icons';
import { Wordmark } from './Onboarding';

function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  trailing,
  theme,
}: {
  label: string;
  type?: 'text' | 'password' | 'email';
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  trailing?: React.ReactNode;
  theme: ThemeType;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text
        style={[
          styles.fieldLabel,
          {
            color: theme.dim,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        {label}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          secureTextEntry={type === 'password'}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.dim2}
          style={[
            styles.input,
            {
              backgroundColor: theme.glass,
              borderColor: theme.border,
              color: theme.text,
              fontFamily: theme.font,
              paddingRight: trailing ? 46 : 15,
            },
          ]}
        />
        {trailing && <View style={styles.trailingContainer}>{trailing}</View>}
      </View>
    </View>
  );
}

function SocialBtn({
  mark,
  markBg,
  label,
  onClick,
  theme,
}: {
  mark: string;
  markBg: string;
  label: string;
  onClick: () => void;
  theme: ThemeType;
}) {
  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.8}
      style={[
        styles.socialBtn,
        {
          backgroundColor: theme.glass,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.socialMark,
          {
            backgroundColor: markBg,
          },
        ]}
      >
        <Text style={styles.socialMarkText}>{mark}</Text>
      </View>
      <Text
        style={[
          styles.socialBtnText,
          {
            color: theme.text,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function AuthScreen({
  theme,
  onAuthed,
}: {
  theme: ThemeType;
  onAuthed: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);

  const reg = mode === 'register';
  const valid = email.trim() && pass.trim() && (!reg || name.trim());

  const eye = (
    <IconBtn size={36} onClick={() => setShow((s) => !s)} theme={theme}>
      {show ? <IcEyeOff size={17} /> : <IcEye size={17} />}
    </IconBtn>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Wordmark size={26} theme={theme} />

        <View style={styles.heroSection}>
          <Text
            style={[
              styles.heroTitle,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {reg ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text
            style={[
              styles.heroSub,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            {reg
              ? 'Start tracking money & vehicles in minutes.'
              : 'Log in to pick up where you left off.'}
          </Text>
        </View>

        {/* social */}
        <View style={styles.socialSection}>
          <SocialBtn
            mark="G"
            markBg="#4285F4"
            label="Continue with Google"
            onClick={onAuthed}
            theme={theme}
          />
          <SocialBtn
            mark=""
            markBg={theme.strong}
            label="Continue with Apple"
            onClick={onAuthed}
            theme={theme}
          />
        </View>

        {/* divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text
            style={[
              styles.dividerText,
              {
                color: theme.dim2,
                fontFamily: theme.mono,
              },
            ]}
          >
            or use email
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {reg && (
          <AuthField
            label="Full name"
            value={name}
            onChange={setName}
            placeholder="Kavya Perera"
            theme={theme}
          />
        )}
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          theme={theme}
        />
        <AuthField
          label="Password"
          type={show ? 'text' : 'password'}
          value={pass}
          onChange={setPass}
          placeholder={reg ? 'Create a password' : '••••••••'}
          trailing={eye}
          theme={theme}
        />

        {!reg && (
          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.forgotText,
                {
                  color: theme.accent,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => valid && onAuthed()}
          disabled={!valid}
          activeOpacity={0.8}
          style={[
            styles.submitBtn,
            {
              backgroundColor: valid ? theme.accent : theme.track,
            },
          ]}
        >
          <Text
            style={[
              styles.submitBtnText,
              {
                color: valid ? theme.accentInk : theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {reg ? 'Create account' : 'Log in'}
          </Text>
        </TouchableOpacity>

        {!reg && (
          <TouchableOpacity
            onPress={onAuthed}
            activeOpacity={0.8}
            style={[
              styles.faceIdBtn,
              {
                borderColor: theme.border2,
              },
            ]}
          >
            <IcLock size={17} stroke={theme.accent} />
            <Text
              style={[
                styles.faceIdText,
                {
                  color: theme.text,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Log in with Face ID
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <View style={styles.toggleRow}>
          <Text
            style={[
              styles.toggleLabel,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            {reg ? 'Already have an account? ' : 'New to SpendWise? '}
          </Text>
          <TouchableOpacity
            onPress={() => setMode(reg ? 'login' : 'register')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleAction,
                {
                  color: theme.accent,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {reg ? 'Log in' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.terms,
            {
              color: theme.dim2,
              fontFamily: theme.font,
            },
          ]}
        >
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 66,
    paddingHorizontal: 24,
    paddingBottom: 28,
    flexGrow: 1,
  },
  heroSection: {
    marginTop: 30,
    marginBottom: 22,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  heroSub: {
    fontSize: 14.5,
    marginTop: 6,
  },
  socialSection: {
    gap: 10,
    marginBottom: 18,
  },
  socialBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  socialMarkText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  socialBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11.5,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11.5,
    letterSpacing: 0.4,
    fontWeight: '600',
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15.5,
  },
  trailingContainer: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -18 }],
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  faceIdBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  faceIdText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
    minHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  toggleLabel: {
    fontSize: 14,
  },
  toggleAction: {
    fontSize: 14,
    fontWeight: '700',
  },
  terms: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
