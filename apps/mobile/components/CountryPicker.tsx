import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  SafeAreaView, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Font } from '../constants/theme';

interface Country {
  code: string;
  flag: string;
  names: { ko: string; vi: string; en: string };
}

const COUNTRIES: Country[] = [
  { code: '+84', flag: '🇻🇳', names: { ko: '베트남', vi: 'Việt Nam', en: 'Vietnam' } },
  { code: '+82', flag: '🇰🇷', names: { ko: '대한민국', vi: 'Hàn Quốc', en: 'South Korea' } },
  { code: '+1', flag: '🇺🇸', names: { ko: '미국', vi: 'Mỹ', en: 'USA' } },
  { code: '+61', flag: '🇦🇺', names: { ko: '호주', vi: 'Úc', en: 'Australia' } },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function CountryPicker({ value, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);

  const selected = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];
  const lang: 'ko' | 'vi' | 'en' =
    i18n.language === 'ko' || i18n.language === 'vi' || i18n.language === 'en'
      ? i18n.language
      : 'ko';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={styles.triggerFlag}>{selected.flag}</Text>
        <Text style={styles.triggerCode}>{selected.code}</Text>
        <Text style={styles.triggerChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('auth.select_country')}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.closeBtn}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item.code === value && styles.optionSelected]}
                onPress={() => {
                  onChange(item.code);
                  setVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.optionFlag}>{item.flag}</Text>
                <Text style={[styles.optionName, item.code === value && styles.optionNameSelected]}>
                  {item.names[lang]}
                </Text>
                <Text style={[styles.optionCode, item.code === value && styles.optionCodeSelected]}>
                  {item.code}
                </Text>
                {item.code === value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  triggerFlag: { fontSize: 20 },
  triggerCode: { ...Font.body2, color: Colors.onSurface, fontWeight: '600', flex: 1 },
  triggerChevron: { fontSize: 12, color: Colors.onSurfaceVariant },

  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay30,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  sheetTitle: { ...Font.t3, color: Colors.onSurface },
  closeBtn: { ...Font.body3, color: Colors.primary, fontWeight: '600' },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  optionSelected: { backgroundColor: Colors.primaryContainer },
  optionFlag: { fontSize: 24 },
  optionName: { ...Font.body2, color: Colors.onSurface, flex: 1 },
  optionNameSelected: { color: Colors.primaryDark, fontWeight: '600' },
  optionCode: { ...Font.body3, color: Colors.onSurfaceVariant },
  optionCodeSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
