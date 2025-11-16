import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface PriceRangeFilterProps {
  label?: string;
  currencySymbol?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onClear: () => void;
  helperText?: string;
  isClearVisible?: boolean;
  containerStyle?: ViewStyle;
}

export function PriceRangeFilter({
  label = 'Price range',
  currencySymbol = '$',
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onClear,
  helperText,
  isClearVisible = true,
  containerStyle,
}: PriceRangeFilterProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label} ({currencySymbol})</Text>
        {isClearVisible && (minValue.length > 0 || maxValue.length > 0) && (
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.inputRow}>
        <View style={[styles.inputWrapper, styles.inputSpacing]}>
          <Text style={styles.inputLabel}>Min</Text>
          <TextInput
            value={minValue}
            onChangeText={onMinChange}
            keyboardType="numeric"
            placeholder="40"
            placeholderTextColor="#A1BC98"
            style={styles.input}
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Max</Text>
          <TextInput
            value={maxValue}
            onChangeText={onMaxChange}
            keyboardType="numeric"
            placeholder="120"
            placeholderTextColor="#A1BC98"
            style={styles.input}
          />
        </View>
      </View>
      {!!helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#778873',
  },
  clearText: {
    fontSize: 14,
    color: '#A1BC98',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F6F8EC',
    borderRadius: 12,
    padding: 10,
  },
  inputSpacing: {
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#778873',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#55624C',
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
    color: '#778873',
  },
});

export default PriceRangeFilter;
