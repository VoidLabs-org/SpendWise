import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export interface IconProps {
  size?: number;
  stroke?: string;
  sw?: number;
  fill?: string;
  style?: any;
}

const Icon = ({
  size = 22,
  stroke = 'currentColor',
  sw = 1.8,
  fill = 'none',
  children,
  vb = 24,
  style,
}: IconProps & { children: React.ReactNode; vb?: number }) => (
  <Svg
    width={size}
    height={size}
    viewBox={`0 0 ${vb} ${vb}`}
    style={style}
  >
    <G
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </G>
  </Svg>
);

export const IcFuel = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M14 21V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v15" />
    <Path d="M3 21h13" />
    <Path d="M14 9h2.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9.5L18 6" />
    <Path d="M7 8h4" />
  </Icon>
);

export const IcFood = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" />
    <Path d="M6 3v18" />
    <Path d="M16 3c-1.5 1-2 3-2 5s.5 4 2 5v8" />
  </Icon>
);

export const IcCart = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 4h2l2 12h9l2-8H7" />
    <Circle cx="10" cy="20" r="1.3" />
    <Circle cx="18" cy="20" r="1.3" />
  </Icon>
);

export const IcBolt = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </Icon>
);

export const IcWrench = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M15 4a5 5 0 0 0-5 6L4 16a2 2 0 0 0 3 3l6-6a5 5 0 0 0 6-5l-3 3-3-1-1-3z" />
  </Icon>
);

export const IcFilm = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3" y="4" width="18" height="16" rx={2} />
    <Path d="M3 9h18" />
    <Path d="M8 4v16" />
    <Path d="M16 4v16" />
  </Icon>
);

export const IcCar = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13" />
    <Path d="M4 13h16v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <Circle cx="7.5" cy="15.5" r="0.6" />
    <Circle cx="16.5" cy="15.5" r="0.6" />
  </Icon>
);

export const IcBell = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <Path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);

export const IcShield = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
  </Icon>
);

export const IcDoc = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <Path d="M14 3v5h5" />
  </Icon>
);

export const IcHome = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 11l8-7 8 7" />
    <Path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
  </Icon>
);

export const IcList = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M8 6h12M8 12h12M8 18h12" />
    <Circle cx="4" cy="6" r="0.6" />
    <Circle cx="4" cy="12" r="0.6" />
    <Circle cx="4" cy="18" r="0.6" />
  </Icon>
);

export const IcChart = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 20V4" />
    <Path d="M4 20h16" />
    <Rect x="7" y="11" width="3" height="6" rx={0.5} />
    <Rect x="13" y="7" width="3" height="10" rx={0.5} />
  </Icon>
);

export const IcGear = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" />
  </Icon>
);

export const IcPlus = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IcArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const IcArrowDown = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
);

export const IcChevron = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M9 6l6 6-6 6" />
  </Icon>
);

export const IcSearch = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="11" cy="11" r="7" />
    <Path d="M21 21l-4-4" />
  </Icon>
);

export const IcFilter = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3 5h18M6 12h12M10 19h4" />
  </Icon>
);

export const IcEdit = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 20h4L19 9l-4-4L4 16z" />
    <Path d="M14 6l4 4" />
  </Icon>
);

export const IcTrash = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </Icon>
);

export const IcCamera = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <Circle cx="12" cy="13" r="3.2" />
  </Icon>
);

export const IcCalendar = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="4" y="5" width="16" height="16" rx={2} />
    <Path d="M4 9h16M8 3v4M16 3v4" />
  </Icon>
);

export const IcCheck = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 12l5 5L20 6" />
  </Icon>
);

export const IcX = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IcLock = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="5" y="11" width="14" height="9" rx={2} />
    <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const IcMoon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z" />
  </Icon>
);

export const IcGlobe = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8" />
    <Path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
  </Icon>
);

export const IcDownload = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </Icon>
);

export const IcStar = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3l2.6 5.5 6 .8-4.3 4.2 1 6L12 17l-5.3 2.5 1-6L3.4 9.3l6-.8z" />
  </Icon>
);

export const IcGauge = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5 18a7 7 0 1 1 14 0" />
    <Path d="M12 18l4-5" />
  </Icon>
);

export const IcReceipt = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <Path d="M9 8h6M9 12h6" />
  </Icon>
);

export const IcEye = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <Circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IcEyeOff = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3 3l18 18" />
    <Path d="M10.6 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3 3.4" />
    <Path d="M6.2 6.3A16 16 0 0 0 2 12s4 7 10 7a10 10 0 0 0 3.7-.7" />
  </Icon>
);

// Map reminder icons by name
export const ReminderIcons: Record<string, React.ComponentType<IconProps>> = {
  Shield: IcShield,
  Doc: IcDoc,
  Receipt: IcReceipt,
  Wrench: IcWrench,
};

export const CAT_ICONS: Record<string, { Icon: React.ComponentType<IconProps>; color: string }> = {
  Food: { Icon: IcFood, color: '#FF8A65' },
  Fuel: { Icon: IcFuel, color: '#C7F94B' },
  Shopping: { Icon: IcCart, color: '#6EC6FF' },
  Bills: { Icon: IcBolt, color: '#FFD24D' },
  Entertainment: { Icon: IcFilm, color: '#B388FF' },
  Health: { Icon: IcShield, color: '#69F0AE' },
  Transport: { Icon: IcCar, color: '#C7F94B' },
  Maintenance: { Icon: IcWrench, color: '#FFAB91' },
  Income: { Icon: IcArrowDown, color: '#C7F94B' },
};
