const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    #fog {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none; z-index: 500;
    }
    #player {
      position: absolute;
      width: 16px; height: 16px;
      background: #4fc3f7; border: 3px solid #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 600; pointer-events: none;
      box-shadow: 0 0 10px rgba(79,195,247,0.9);
      display: none;
    }
    #status {
      position: absolute; bottom: 20px; left: 0; right: 0;
      text-align: center; color: rgba(255,255,255,0.6);
      font-size: 13px; z-index: 700; pointer-events: none;
      font-family: sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="fog"></canvas>
  <div id="player"></div>
  <div id="status">正在定位...</div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    // 底层：完整高德地图（被迷雾遮盖，仅探索区域显示）
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: '1234',
    }).addTo(map);

    // 迷雾上方：极低透明度的地图层，透出城市道路/边界轮廓
    map.createPane('outlinePane');
    map.getPane('outlinePane').style.zIndex = 550; // 高于迷雾 canvas(500)，低于玩家标记(600)
    map.getPane('outlinePane').style.pointerEvents = 'none';
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: '1234',
      pane: 'outlinePane',
      opacity: 0.13, // 13% 透明度：只能看到轮廓，看不清细节
    }).addTo(map);

    var canvas = document.getElementById('fog');
    var ctx = canvas.getContext('2d');
    var player = document.getElementById('player');
    var status = document.getElementById('status');
    var explored = [];   // 存 GCJ-02 坐标
    var playerPos = null;
    var mapInitialized = false;
    var REVEAL_METERS = 80; // 视野半径（真实米数），缩放时自动换算像素

    // ── WGS-84 → GCJ-02 坐标转换（修复高德地图偏移）──────────────
    function transformLat(x, y) {
      var ret = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
      ret += (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI)) * 2/3;
      ret += (20*Math.sin(y*Math.PI) + 40*Math.sin(y/3*Math.PI)) * 2/3;
      ret += (160*Math.sin(y/12*Math.PI) + 320*Math.sin(y/30*Math.PI)) * 2/3;
      return ret;
    }
    function transformLng(x, y) {
      var ret = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
      ret += (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI)) * 2/3;
      ret += (20*Math.sin(x*Math.PI) + 40*Math.sin(x/3*Math.PI)) * 2/3;
      ret += (150*Math.sin(x/12*Math.PI) + 300*Math.sin(x/30*Math.PI)) * 2/3;
      return ret;
    }
    function wgs84ToGcj02(lat, lng) {
      var a = 6378245.0, ee = 0.00669342162296594323;
      var dlat = transformLat(lng - 105, lat - 35);
      var dlng = transformLng(lng - 105, lat - 35);
      var radlat = lat * Math.PI / 180;
      var magic = Math.sin(radlat);
      magic = 1 - ee * magic * magic;
      var sqrtM = Math.sqrt(magic);
      dlat = dlat * 180 / ((a * (1 - ee)) / (magic * sqrtM) * Math.PI);
      dlng = dlng * 180 / (a / sqrtM * Math.cos(radlat) * Math.PI);
      return { lat: lat + dlat, lng: lng + dlng };
    }

    // ── 米数 → 当前缩放级别的像素数 ──────────────────────────────
    function metersToPixels(lat) {
      var zoom = map.getZoom();
      var metersPerPx = 40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom + 8);
      return REVEAL_METERS / metersPerPx;
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; // 迷雾完全不透明
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      explored.forEach(function(p) { erasePoint(p.lat, p.lng); });
      updatePlayer();
    }

    function erasePoint(lat, lng) {
      var pt = map.latLngToContainerPoint([lat, lng]);
      var r = metersToPixels(lat); // 半径随缩放变化
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function updatePlayer() {
      if (!playerPos) return;
      var pt = map.latLngToContainerPoint(playerPos);
      player.style.left = pt.x + 'px';
      player.style.top = pt.y + 'px';
      player.style.display = 'block';
    }

    map.on('move', redraw);
    map.on('zoom', redraw);
    window.addEventListener('resize', resize);
    resize();

    // ── 接收来自 React Native 的消息（恢复历史数据）────────────────
    function handleRNMessage(event) {
      var data;
      try { data = JSON.parse(event.data); } catch(e) { return; }

      if (data.type === 'RESTORE') {
        status.textContent = '恢复探索记录...';
        (data.points || []).forEach(function(p) {
          explored.push({ lat: p.lat, lng: p.lng });
        });
        redraw();
        status.textContent = '';
      }
    }
    window.addEventListener('message', handleRNMessage);
    document.addEventListener('message', handleRNMessage);

    // ── 在 WebView 内部使用 navigator.geolocation ─────────────────
    // 这不依赖 Google Play Services，直接走系统定位
    function onPosition(pos) {
      // GPS 给 WGS-84，转换为高德地图用的 GCJ-02
      var gcj = wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude);
      var lat = gcj.lat, lng = gcj.lng;

      if (!mapInitialized) {
        mapInitialized = true;
        map.setView([lat, lng], 16);
        status.textContent = '';
      }

      playerPos = [lat, lng];
      explored.push({ lat: lat, lng: lng });
      erasePoint(lat, lng);
      updatePlayer();

      // 通知 React Native 保存（存 GCJ-02 坐标）
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOCATION_UPDATE',
          lat: lat,
          lng: lng
        }));
      }
    }

    function onPositionError(err) {
      status.textContent = '定位失败(' + err.code + '): ' + err.message;
      console.log('Geo error', err.code, err.message);
    }

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(onPosition, onPositionError, {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000
      });
    } else {
      status.textContent = '此设备不支持定位';
    }
  <\/script>
</body>
</html>`;

export default mapHtml;
