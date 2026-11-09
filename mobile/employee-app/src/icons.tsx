import React from 'react';
import { View } from 'react-native';

/* Small line icons drawn with Views, so the app needs no icon font. */

export function TrackIcon({ color, size = 22 }: { color: string; size?: number }) {
  const rail = Math.max(2, Math.round(size / 11));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: size * 0.28, top: size * 0.1, bottom: size * 0.1, width: rail, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: size * 0.28, top: size * 0.1, bottom: size * 0.1, width: rail, borderRadius: 1, backgroundColor: color }} />
      {[0.24, 0.5, 0.76].map((pos) => (
        <View key={pos} style={{ position: 'absolute', left: size * 0.16, right: size * 0.16, top: size * pos - 1, height: 2, borderRadius: 1, backgroundColor: color, opacity: 0.7 }} />
      ))}
    </View>
  );
}

export function ClockIcon({ color, size = 22 }: { color: string; size?: number }) {
  const ring = Math.max(2, Math.round(size / 11));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.86, height: size * 0.86, borderRadius: size, borderWidth: ring, borderColor: color }} />
      <View style={{ position: 'absolute', width: ring, height: size * 0.3, top: size * 0.22, left: size / 2 - ring / 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', width: size * 0.22, height: ring, top: size / 2 - ring / 2, left: size / 2 - ring / 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function UserIcon({ color, size = 22 }: { color: string; size?: number }) {
  const line = Math.max(2, Math.round(size / 11));
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ marginTop: size * 0.06, width: size * 0.42, height: size * 0.42, borderRadius: size, borderWidth: line, borderColor: color }} />
      <View
        style={{
          marginTop: size * 0.06,
          width: size * 0.78,
          height: size * 0.36,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          borderWidth: line,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
    </View>
  );
}
