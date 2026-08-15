import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ThemeType } from '@/constants/theme';
import { Chip, SectionLabel } from '@/components/SharedComponents';
import { IcChart, IcList, IcCar, IcStar } from '@/components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function Wordmark({ size = 30, theme }: { size?: number; theme: ThemeType }) {
  return (
    <View style={styles.wordmark}>
      <View
        style={[
          styles.wordmarkLogo,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: theme.accent,
          },
        ]}
      >
        <IcChart size={size * 0.6} stroke={theme.accentInk} sw={2.4} />
      </View>
      <Text
        style={[
          styles.wordmarkText,
          {
            fontSize: size * 0.8,
            color: theme.text,
            fontFamily: theme.fontBold,
          },
        ]}
      >
        SpendWise
      </Text>
    </View>
  );
}

export function SplashView({ theme }: { theme: ThemeType }) {
  return (
    <View style={[styles.splash, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.splashGlow,
          {
            backgroundColor: theme.accentDim,
          },
        ]}
      />
      <Wordmark size={40} theme={theme} />
      <Text
        style={[
          styles.splashSub,
          {
            color: theme.dim,
            fontFamily: theme.mono,
          },
        ]}
      >
        money + vehicles, together
      </Text>
      <Text
        style={[
          styles.splashFooter,
          {
            color: theme.dim2,
            fontFamily: theme.mono,
          },
        ]}
      >
        v1.0 · made in Sri Lanka
      </Text>
    </View>
  );
}

export function Onboarding({
  theme,
  onFinish,
}: {
  theme: ThemeType;
  onFinish: (userName: string, currency: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Kavya');
  const [cur, setCur] = useState('LKR');

  const slides = [
    {
      Icon: IcList,
      tone: theme.accent,
      title: 'Track every rupee',
      body: 'Log income and expenses in seconds. Smart categories, budgets and recurring bills — all offline-first.',
    },
    {
      Icon: IcCar,
      tone: '#6EC6FF',
      title: 'Your vehicle, fully managed',
      body: 'Fuel efficiency, maintenance, insurance and revenue licence reminders — a first-class home for every vehicle.',
    },
    {
      Icon: IcStar,
      tone: theme.ai,
      title: 'Insights that pay off',
      body: 'See where money goes, spot unusual spending and get a monthly financial health score.',
    },
  ];

  const skip = () => setStep(4);
  const next = () => setStep((s) => (s < 3 ? s + 1 : 4));
  const finish = () => onFinish(name, cur);

  // Setup view
  if (step === 4) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <Wordmark size={26} theme={theme} />
        </View>

        <View style={styles.setupBody}>
          <Text
            style={[
              styles.setupTitle,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Let's set you up
          </Text>
          <Text
            style={[
              styles.setupSub,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            Two quick things and you're in.
          </Text>

          <SectionLabel style={styles.label} theme={theme}>
            Your name
          </SectionLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                backgroundColor: theme.glass,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: theme.font,
              },
            ]}
            placeholderTextColor={theme.dim2}
          />

          <SectionLabel style={styles.label} theme={theme}>
            Base currency
          </SectionLabel>
          <View style={styles.currencyRow}>
            {['LKR', 'USD', 'INR', 'EUR', 'GBP'].map((c) => (
              <Chip key={c} active={cur === c} onClick={() => setCur(c)} theme={theme}>
                {c}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={finish}
            activeOpacity={0.8}
            style={[
              styles.btn,
              {
                backgroundColor: theme.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.btnText,
                {
                  color: theme.accentInk,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              Start using SpendWise
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Slide view
  const s = slides[step - 1];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, styles.headerRow]}>
        <Wordmark size={22} theme={theme} />
        <TouchableOpacity onPress={skip} activeOpacity={0.7}>
          <Text
            style={[
              styles.skipText,
              {
                color: theme.dim,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.carouselContainer}>
        {/* hero tile */}
        <View
          style={[
            styles.heroTile,
            {
              backgroundColor: theme.glass,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              {
                backgroundColor: s.tone,
              },
            ]}
          />
          <s.Icon size={76} stroke={s.tone} sw={1.5} />
        </View>

        <View style={styles.slideTextContainer}>
          <Text
            style={[
              styles.slideTitle,
              {
                color: theme.text,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {s.title}
          </Text>
          <Text
            style={[
              styles.slideBody,
              {
                color: theme.dim,
                fontFamily: theme.font,
              },
            ]}
          >
            {s.body}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, styles.footerRow]}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === step - 1 ? 22 : 7,
                  backgroundColor: i === step - 1 ? theme.accent : theme.track,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={next}
          activeOpacity={0.8}
          style={[
            styles.carouselBtn,
            {
              backgroundColor: theme.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.carouselBtnText,
              {
                color: theme.accentInk,
                fontFamily: theme.fontBold,
              },
            ]}
          >
            {step < 3 ? 'Next' : 'Get started'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wordmarkText: {
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.12,
    top: '32%',
  },
  splashSub: {
    fontSize: 13,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 60,
    fontSize: 11.5,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  heroTile: {
    width: 188,
    height: 188,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.06,
  },
  slideTextContainer: {
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  slideBody: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  setupBody: {
    flex: 1,
    marginTop: 10,
  },
  setupTitle: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  setupSub: {
    fontSize: 14.5,
    marginTop: 6,
    marginBottom: 30,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 24,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    justifyContent: 'flex-end',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btn: {
    width: '100%',
    padding: 17,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  carouselBtn: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
  },
  carouselBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 99,
  },
});
