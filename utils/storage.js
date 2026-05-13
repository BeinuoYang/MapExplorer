import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'explored_points_v1';

export async function loadExploredPoints() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function appendExploredPoint(lat, lng) {
  try {
    const existing = await loadExploredPoints();
    existing.push({ lat, lng });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // 存储失败不影响运行
  }
}

export async function clearExploredPoints() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
