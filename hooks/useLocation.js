import { useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

const MIN_DISTANCE_METERS = 15;

function haversineDistance(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function useLocation(onLocationUpdate) {
  const subscriptionRef = useRef(null);
  const lastPointRef = useRef(null);
  const callbackRef = useRef(onLocationUpdate);
  callbackRef.current = onLocationUpdate;

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('[useLocation] 权限状态:', status);
    if (status !== 'granted') return false;

    console.log('[useLocation] 尝试获取上次已知位置...');
    // 先用缓存位置（秒级返回），避免室内 GPS 无信号时卡住
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000 });
    if (lastKnown) {
      console.log('[useLocation] 上次已知位置:', lastKnown.coords.latitude, lastKnown.coords.longitude);
      const initCoords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
      lastPointRef.current = initCoords;
      callbackRef.current({ ...initCoords, isFirst: true });
    } else {
      // 没有缓存位置则等待真实 GPS（设 15s 超时）
      console.log('[useLocation] 无缓存，等待 GPS...');
      try {
        const initial = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
        ]);
        console.log('[useLocation] GPS 位置:', initial.coords.latitude, initial.coords.longitude);
        const initCoords = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
        lastPointRef.current = initCoords;
        callbackRef.current({ ...initCoords, isFirst: true });
      } catch (e) {
        console.log('[useLocation] GPS 超时或失败:', e.message);
      }
    }

    // 持续追踪
    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: MIN_DISTANCE_METERS,
        timeInterval: 5000,
      },
      (loc) => {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        // 双重校验距离（有些设备 distanceInterval 不精准）
        if (lastPointRef.current) {
          const dist = haversineDistance(lastPointRef.current, coords);
          if (dist < MIN_DISTANCE_METERS) return;
        }
        lastPointRef.current = coords;
        callbackRef.current({ ...coords, isFirst: false });
      }
    );
    return true;
  }, []);

  useEffect(() => {
    start();
    return () => {
      subscriptionRef.current?.remove();
    };
  }, [start]);
}
