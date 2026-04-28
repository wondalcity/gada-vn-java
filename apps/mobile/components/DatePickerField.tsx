/**
 * GADA VN Design System — DatePickerField
 * A pure-JS date picker using a bottom-sheet modal with drum/scroll columns.
 * No native modules required.
 * Usage: <DatePickerField value="2000-01-01" onChange={(v) => setDob(v)} />
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { Colors, Font, Radius, Spacing } from '../constants/theme';

interface DatePickerFieldProps {
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const DRUM_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function generateYears(min: number, max: number): string[] {
  const years: string[] = [];
  for (let y = max; y >= min; y--) years.push(String(y));
  return years;
}

function generateDays(year: number, month: number): string[] {
  const count = daysInMonth(year, month);
  const days: string[] = [];
  for (let d = 1; d <= count; d++) days.push(String(d).padStart(2, '0'));
  return days;
}

interface DrumProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  labels?: string[];
}

function Drum({ items, selectedIndex, onSelect, labels }: DrumProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    // Scroll to selected position
    const offset = selectedIndex * ITEM_HEIGHT;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 50);
  }, [selectedIndex, items]);

  function handleScrollEnd(e: { nativeEvent: { contentOffset: { y: number } } }) {
    isScrolling.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    onSelect(clampedIndex);
    scrollRef.current?.scrollTo({ y: clampedIndex * ITEM_HEIGHT, animated: true });
  }

  return (
    <View style={drum.wrapper}>
      {/* Selection highlight */}
      <View style={drum.selection} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={drum.scroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const isActive = i === selectedIndex;
          return (
            <TouchableOpacity
              key={item}
              style={drum.item}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[drum.itemText, isActive && drum.itemTextActive]}>
                {labels ? labels[i] : item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = '날짜 선택',
  minYear = 1950,
  maxYear = new Date().getFullYear() - 15,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  // Parse current value
  const parsed = value ? value.split('-') : null;
  const initYear = parsed?.[0] ?? String(maxYear);
  const initMonth = parsed?.[1] ? parseInt(parsed[1], 10) - 1 : 0;
  const initDay = parsed?.[2] ? parseInt(parsed[2], 10) - 1 : 0;

  const years = generateYears(minYear, maxYear);
  const [selectedYearIdx, setSelectedYearIdx] = useState(
    Math.max(0, years.indexOf(initYear))
  );
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(initMonth);
  const [selectedDayIdx, setSelectedDayIdx] = useState(initDay);

  const selectedYear = parseInt(years[selectedYearIdx], 10);
  const selectedMonth = selectedMonthIdx + 1;
  const days = generateDays(selectedYear, selectedMonth);

  // Clamp day if month changed
  useEffect(() => {
    const maxDay = days.length;
    if (selectedDayIdx >= maxDay) setSelectedDayIdx(maxDay - 1);
  }, [selectedYear, selectedMonth]);

  function handleConfirm() {
    const y = years[selectedYearIdx];
    const m = MONTHS[selectedMonthIdx];
    const d = days[Math.min(selectedDayIdx, days.length - 1)];
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  }

  function displayValue(): string {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
  }

  return (
    <>
      <TouchableOpacity style={field.container} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[field.text, !value && field.placeholder]}>
          {value ? displayValue() : placeholder}
        </Text>
        <Text style={field.chevron}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={modal.sheet} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={modal.header}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={modal.cancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={modal.title}>생년월일</Text>
              <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
                <Text style={modal.confirmText}>확인</Text>
              </TouchableOpacity>
            </View>

            {/* Drums */}
            <View style={modal.drumsRow}>
              <Drum
                items={years}
                selectedIndex={selectedYearIdx}
                onSelect={setSelectedYearIdx}
                labels={years.map(y => `${y}년`)}
              />
              <Drum
                items={MONTHS}
                selectedIndex={selectedMonthIdx}
                onSelect={setSelectedMonthIdx}
                labels={MONTH_LABELS}
              />
              <Drum
                items={days}
                selectedIndex={selectedDayIdx}
                onSelect={setSelectedDayIdx}
                labels={days.map(d => `${parseInt(d, 10)}일`)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const drum = StyleSheet.create({
  wrapper: {
    flex: 1,
    height: DRUM_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selection: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xs,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    ...Font.body3,
    color: Colors.disabled,
    textAlign: 'center',
  },
  itemTextActive: {
    ...Font.t4,
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
  },
});

const field = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outline,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
  },
  text: {
    flex: 1,
    ...Font.body3,
    color: Colors.onSurface,
  },
  placeholder: {
    color: Colors.disabled,
  },
  chevron: {
    fontSize: 16,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay30,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  title: {
    ...Font.t4,
    color: Colors.onSurface,
  },
  cancelText: {
    ...Font.body3,
    color: Colors.onSurfaceVariant,
  },
  confirmText: {
    ...Font.body3,
    color: Colors.primary,
    fontWeight: '700',
  },
  drumsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: 8,
  },
});
