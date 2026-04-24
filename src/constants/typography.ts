import { Platform, TextStyle } from 'react-native';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

export const DM_SANS_FONTS: Record<FontWeight, string> = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  black: 'DMSans_900Black',
};

export const textFont = (weight: FontWeight = 'regular', preferSystem: boolean = false): TextStyle => {
  if (preferSystem) {
    return {
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
      fontWeight: (weight === 'bold' ? 'bold' : 'normal') as TextStyle['fontWeight'],
    };
  }
  return {
    fontFamily: DM_SANS_FONTS[weight] || DM_SANS_FONTS.regular,
  };
};
