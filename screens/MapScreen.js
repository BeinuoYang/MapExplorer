import React, { useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { loadExploredPoints, appendExploredPoint } from '../utils/storage';
import mapHtml from '../assets/mapHtml';

export default function MapScreen() {
  const webviewRef = useRef(null);

  // WebView 加载完成后恢复历史探索数据
  const onWebViewLoad = useCallback(async () => {
    console.log('[MapScreen] WebView 加载完成，恢复历史数据...');
    const points = await loadExploredPoints();
    console.log('[MapScreen] 历史探索点数量:', points.length);
    if (points.length > 0) {
      webviewRef.current?.postMessage(JSON.stringify({ type: 'RESTORE', points }));
    }
  }, []);

  // 接收 WebView 发来的消息（定位更新）
  const onWebViewMessage = useCallback(async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_UPDATE') {
        console.log('[MapScreen] 收到位置:', data.lat, data.lng);
        await appendExploredPoint(data.lat, data.lng);
      }
    } catch (e) {
      // 忽略解析失败
    }
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html: mapHtml, baseUrl: 'https://localhost' }}
        style={styles.webview}
        onLoad={onWebViewLoad}
        onMessage={onWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
});
