const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { color: #f8fafc; }
    #map { width: 100%; height: 100%; position: absolute; inset: 0; background: #111; }
    #fog { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 500; }
    #pixelGrid {
      position: absolute; inset: 0; z-index: 448;
      pointer-events: none; display: none;
      background-image:
        linear-gradient(rgba(57,255,20,0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(57,255,20,0.055) 1px, transparent 1px);
      background-size: 8px 8px;
    }
    #player {
      position: absolute; width: 16px; height: 16px;
      border: 3px solid #fff; border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 650; pointer-events: none; display: none;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    #hud {
      position: absolute;
      left: 14px; right: 14px; bottom: calc(14px + env(safe-area-inset-bottom));
      z-index: 760;
      display: grid; grid-template-columns: 1fr auto auto;
      align-items: center; gap: 8px; pointer-events: none;
    }
    #stats {
      min-width: 0; padding: 9px 11px; border-radius: 8px;
      background: var(--panel-bg); border: 1px solid var(--panel-border);
      box-shadow: 0 10px 24px rgba(0,0,0,0.25); color: var(--panel-text);
      pointer-events: auto;
    }
    #status {
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-size: 12px; opacity: 0.72; line-height: 1.1;
    }
    #area { margin-top: 3px; font-size: 19px; font-weight: 800; line-height: 1.05; }
    .hud-button {
      width: 44px; height: 44px; display: grid; place-items: center;
      border: 1px solid var(--panel-border); border-radius: 8px;
      background: var(--panel-bg); color: var(--panel-text);
      box-shadow: 0 10px 24px rgba(0,0,0,0.25); font-size: 20px; pointer-events: auto;
    }
    .panel {
      position: absolute; left: 14px; right: 14px;
      bottom: calc(72px + env(safe-area-inset-bottom));
      z-index: 780; padding: 12px; border-radius: 8px;
      background: var(--panel-bg); border: 1px solid var(--panel-border);
      color: var(--panel-text); box-shadow: 0 16px 36px rgba(0,0,0,0.35); display: none;
    }
    .panel.open { display: block; }
    .panel-title {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 10px; font-size: 13px; font-weight: 800;
    }
    .close-button { border: 0; background: transparent; color: var(--panel-text); font-size: 22px; line-height: 1; padding: 0 4px; }
    .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .option {
      min-height: 58px; text-align: left; border-radius: 8px;
      border: 1px solid var(--option-border); background: var(--option-bg);
      color: var(--panel-text); padding: 9px;
    }
    .option.active { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .option-name { display: block; font-size: 13px; font-weight: 800; line-height: 1.1; }
    .option-hint { display: block; margin-top: 5px; font-size: 11px; opacity: 0.68; line-height: 1.25; }
    #toast {
      position: absolute; top: calc(14px + env(safe-area-inset-top)); left: 50%;
      transform: translateX(-50%); z-index: 820; max-width: calc(100vw - 28px);
      padding: 9px 12px; border-radius: 8px;
      background: var(--panel-bg); border: 1px solid var(--panel-border);
      color: var(--panel-text); box-shadow: 0 12px 28px rgba(0,0,0,0.25);
      font-size: 12px; opacity: 0; pointer-events: none;
      transition: opacity 160ms ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="fog"></canvas>
  <div id="pixelGrid"></div>
  <div id="player"></div>

  <div id="hud">
    <div id="stats">
      <div id="status">正在定位...</div>
      <div id="area">0 m²</div>
    </div>
    <button class="hud-button" id="themeButton" aria-label="主题">◐</button>
    <button class="hud-button" id="exportButton" aria-label="导出">⇪</button>
  </div>

  <div class="panel" id="themePanel">
    <div class="panel-title">
      <span>地图主题</span>
      <button class="close-button" data-close="themePanel">×</button>
    </div>
    <div class="option-grid" id="themeOptions"></div>
  </div>

  <div class="panel" id="exportPanel">
    <div class="panel-title">
      <span>导出探索地图</span>
      <button class="close-button" data-close="exportPanel">×</button>
    </div>
    <div class="option-grid" id="exportOptions"></div>
  </div>

  <div id="toast"></div>

  <script>
    var REVEAL_METERS = 80;
    var GRID_METERS = 20;
    var THEME_KEY = 'mapexplorer_theme_v1';
    var EXPORT_WIDTH = 1080;
    var EXPORT_HEIGHT = 1920;

    var themes = {
      classic: {
        name: 'Classic Fog', hint: '黑雾与蓝色定位光',
        fog: '#000000', tileFilter: 'none', outlineOpacity: 0.13,
        player: '#4fc3f7', playerGlow: 'rgba(79,195,247,0.9)',
        panelBg: 'rgba(8,12,18,0.82)', panelBorder: 'rgba(255,255,255,0.16)',
        panelText: '#f8fafc', optionBg: 'rgba(255,255,255,0.06)',
        optionBorder: 'rgba(255,255,255,0.14)', accent: '#4fc3f7'
      },
      parchment: {
        name: 'Parchment', hint: '暖色手绘冒险图',
        fog: '#2d2118', tileFilter: 'sepia(0.52) saturate(0.76) hue-rotate(342deg) brightness(0.82) contrast(1.02)',
        outlineOpacity: 0.18, player: '#39b7a5', playerGlow: 'rgba(57,183,165,0.82)',
        panelBg: 'rgba(246,222,174,0.88)', panelBorder: 'rgba(68,43,24,0.24)',
        panelText: '#3a2618', optionBg: 'rgba(100,62,31,0.08)',
        optionBorder: 'rgba(68,43,24,0.20)', accent: '#0f9f8a'
      },
      constructivist: {
        name: 'Constructivist', hint: '红黑米白几何构成',
        fog: '#0a0a0a', tileFilter: 'grayscale(1) sepia(0.34) saturate(1.12) hue-rotate(350deg) brightness(0.78) contrast(1.42)',
        outlineOpacity: 0.17, player: '#e53928', playerGlow: 'rgba(229,57,40,0.92)',
        panelBg: 'rgba(248,238,211,0.90)', panelBorder: 'rgba(10,10,10,0.30)',
        panelText: '#111111', optionBg: 'rgba(229,57,40,0.08)',
        optionBorder: 'rgba(10,10,10,0.22)', accent: '#e53928'
      },
      night: {
        name: 'Night Walk', hint: '低亮夜行模式',
        fog: '#020617', tileFilter: 'brightness(0.62) saturate(0.7) hue-rotate(178deg) contrast(1.18)',
        outlineOpacity: 0.16, player: '#a78bfa', playerGlow: 'rgba(167,139,250,0.9)',
        panelBg: 'rgba(3,7,18,0.86)', panelBorder: 'rgba(167,139,250,0.22)',
        panelText: '#eef2ff', optionBg: 'rgba(167,139,250,0.08)',
        optionBorder: 'rgba(255,255,255,0.12)', accent: '#a78bfa'
      },
      sumi: {
        name: '水墨', hint: '水墨版画 · 朱砂印章',
        fog: '#060402', tileFilter: 'grayscale(1) contrast(1.45) brightness(0.62) sepia(0.15)',
        outlineOpacity: 0.20, player: '#c8272a', playerGlow: 'rgba(200,39,42,0.72)',
        panelBg: 'rgba(252,247,236,0.93)', panelBorder: 'rgba(90,50,20,0.28)',
        panelText: '#1e0f08', optionBg: 'rgba(200,39,42,0.07)',
        optionBorder: 'rgba(90,50,20,0.22)', accent: '#c8272a'
      },
      terminal: {
        name: 'Terminal', hint: '荧光绿 · 军事侦察终端',
        fog: '#000000', tileFilter: 'saturate(0) brightness(0.55) sepia(1) hue-rotate(80deg) saturate(4) contrast(1.28)',
        outlineOpacity: 0.22, player: '#00ff41', playerGlow: 'rgba(0,255,65,0.90)',
        panelBg: 'rgba(0,8,0,0.95)', panelBorder: 'rgba(0,255,65,0.40)',
        panelText: '#00ff41', optionBg: 'rgba(0,255,65,0.08)',
        optionBorder: 'rgba(0,255,65,0.28)', accent: '#00ff41', mono: true
      },
      arctic: {
        name: '极地', hint: '极夜冰封 · 南极考察',
        fog: '#010c1a', tileFilter: 'saturate(0.38) brightness(0.80) hue-rotate(194deg) contrast(1.14)',
        outlineOpacity: 0.18, player: '#e0f7ff', playerGlow: 'rgba(186,230,253,0.85)',
        panelBg: 'rgba(236,251,255,0.92)', panelBorder: 'rgba(12,80,130,0.22)',
        panelText: '#082d4e', optionBg: 'rgba(14,165,233,0.08)',
        optionBorder: 'rgba(12,80,130,0.18)', accent: '#0ea5e9'
      },
      pixel: {
        name: 'Pixel', hint: '8-bit 游戏地图',
        fog: '#080808', tileFilter: 'saturate(0.18) contrast(2.1) brightness(0.72) hue-rotate(96deg)',
        outlineOpacity: 0.15, player: '#39ff14', playerGlow: 'rgba(57,255,20,0.88)',
        panelBg: 'rgba(4,4,4,0.96)', panelBorder: 'rgba(57,255,20,0.55)',
        panelText: '#39ff14', optionBg: 'rgba(57,255,20,0.06)',
        optionBorder: 'rgba(57,255,20,0.28)', accent: '#39ff14',
        mono: true, pixelPlayer: true
      }
    };

    var exportStyles = {
      parchment:     { name: 'Parchment Map',  hint: '羊皮纸、手绘边框' },
      constructivist:{ name: 'Constructivist', hint: '红黑几何海报' },
      atlas:         { name: 'Clean Atlas',    hint: '清爽地图册风格' },
      night:         { name: 'Night Route',    hint: '夜行发光轨迹' },
      expedition:    { name: 'Expedition',     hint: '国家地理探险海报' },
      moss:          { name: 'Moss Map',       hint: '丛林苔藓越野图' },
      classified:    { name: 'Classified',     hint: '机密档案 · 红色标注' }
    };

    var map = L.map('map', { zoomControl: false, attributionControl: false });
    var baseLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18, subdomains: '1234'
    }).addTo(map);

    map.createPane('outlinePane');
    map.getPane('outlinePane').style.zIndex = 550;
    map.getPane('outlinePane').style.pointerEvents = 'none';
    var outlineLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18, subdomains: '1234', pane: 'outlinePane', opacity: 0.13
    }).addTo(map);

    var canvas = document.getElementById('fog');
    var ctx = canvas.getContext('2d');
    var player = document.getElementById('player');
    var pixelGrid = document.getElementById('pixelGrid');
    var statusEl = document.getElementById('status');
    var areaEl = document.getElementById('area');
    var themePanel = document.getElementById('themePanel');
    var exportPanel = document.getElementById('exportPanel');
    var themeOptions = document.getElementById('themeOptions');
    var exportOptions = document.getElementById('exportOptions');
    var toast = document.getElementById('toast');

    var explored = [];
    var exploredKeys = {};
    var areaCells = {};
    var areaSquareMeters = 0;
    var playerPos = null;
    var mapInitialized = false;
    var activeThemeId = localStorage.getItem(THEME_KEY) || 'classic';
    if (!themes[activeThemeId]) activeThemeId = 'classic';

    // ── Coordinate transform ──────────────────────────────────────────────
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

    // ── Fog canvas ────────────────────────────────────────────────────────
    function metersToPixels(lat) {
      var zoom = map.getZoom();
      var mpp = 40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom + 8);
      return REVEAL_METERS / mpp;
    }

    function pointToMeters(point, origin) {
      var latScale = 111320;
      var lngScale = 111320 * Math.cos(origin.lat * Math.PI / 180);
      return { x: (point.lng - origin.lng) * lngScale, y: (point.lat - origin.lat) * latScale };
    }

    function addAreaCells(point) {
      var lngScale = 111320 * Math.cos(point.lat * Math.PI / 180);
      var cx = Math.floor((point.lng * lngScale) / GRID_METERS);
      var cy = Math.floor((point.lat * 111320) / GRID_METERS);
      var rc = Math.ceil(REVEAL_METERS / GRID_METERS);
      for (var dx = -rc; dx <= rc; dx++) {
        for (var dy = -rc; dy <= rc; dy++) {
          var mx = (dx + 0.5) * GRID_METERS, my = (dy + 0.5) * GRID_METERS;
          if (Math.sqrt(mx*mx + my*my) <= REVEAL_METERS)
            areaCells[(cx+dx) + ':' + (cy+dy)] = true;
        }
      }
      areaSquareMeters = Object.keys(areaCells).length * GRID_METERS * GRID_METERS;
      areaEl.textContent = formatArea(areaSquareMeters);
    }

    function formatArea(m2) {
      if (m2 >= 1000000) return (m2 / 1000000).toFixed(2) + ' km²';
      if (m2 >= 10000)   return (m2 / 10000).toFixed(2) + ' ha';
      return Math.round(m2).toLocaleString('zh-CN') + ' m²';
    }

    function addExploredPoint(lat, lng) {
      var key = lat.toFixed(6) + ',' + lng.toFixed(6);
      if (exploredKeys[key]) return false;
      var point = { lat: lat, lng: lng };
      exploredKeys[key] = true;
      explored.push(point);
      addAreaCells(point);
      return true;
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    }

    function redraw() {
      var theme = themes[activeThemeId];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = theme.fog;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      explored.forEach(function(p) { erasePoint(p.lat, p.lng); });
      updatePlayer();
    }

    function erasePoint(lat, lng) {
      var pt = map.latLngToContainerPoint([lat, lng]);
      var r = metersToPixels(lat);
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

    // ── Theme ─────────────────────────────────────────────────────────────
    function applyTheme(themeId) {
      activeThemeId = themeId;
      var theme = themes[themeId];
      localStorage.setItem(THEME_KEY, themeId);

      document.documentElement.style.setProperty('--panel-bg',     theme.panelBg);
      document.documentElement.style.setProperty('--panel-border', theme.panelBorder);
      document.documentElement.style.setProperty('--panel-text',   theme.panelText);
      document.documentElement.style.setProperty('--option-bg',    theme.optionBg);
      document.documentElement.style.setProperty('--option-border',theme.optionBorder);
      document.documentElement.style.setProperty('--accent',       theme.accent);

      player.style.background  = theme.player;
      player.style.boxShadow   = '0 0 10px ' + theme.playerGlow;
      player.style.borderRadius = theme.pixelPlayer ? '2px' : '50%';
      player.style.width        = theme.pixelPlayer ? '14px' : '16px';
      player.style.height       = theme.pixelPlayer ? '14px' : '16px';
      player.style.border       = theme.pixelPlayer ? '2px solid ' + theme.player : '3px solid #fff';

      pixelGrid.style.display = theme.pixelPlayer ? 'block' : 'none';

      document.body.style.fontFamily = theme.mono
        ? '"Courier New", Courier, monospace'
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      // Terminal: style the HUD buttons as square
      document.querySelectorAll('.hud-button, .option, #stats, .panel, #toast').forEach(function(el) {
        el.style.borderRadius = theme.pixelPlayer ? '0' : '';
      });

      if (baseLayer.getContainer())   baseLayer.getContainer().style.filter   = theme.tileFilter;
      if (outlineLayer.getContainer()) outlineLayer.getContainer().style.filter = theme.tileFilter;
      outlineLayer.setOpacity(theme.outlineOpacity);

      if (themeId === 'terminal') {
        statusEl.textContent = mapInitialized ? '> TRACKING_' : '> LOCATING_';
      } else if (!mapInitialized) {
        statusEl.textContent = '正在定位...';
      }

      renderThemeOptions();
      redraw();
    }

    // ── Toast / panel helpers ─────────────────────────────────────────────
    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 1700);
    }

    function togglePanel(panel) {
      var isOpen = panel.classList.contains('open');
      themePanel.classList.remove('open');
      exportPanel.classList.remove('open');
      if (!isOpen) panel.classList.add('open');
    }

    function renderThemeOptions() {
      themeOptions.innerHTML = '';
      Object.keys(themes).forEach(function(id) {
        var t = themes[id];
        var button = document.createElement('button');
        button.className = 'option' + (id === activeThemeId ? ' active' : '');
        button.innerHTML = '<span class="option-name">' + t.name + '</span><span class="option-hint">' + t.hint + '</span>';
        button.onclick = function() { applyTheme(id); themePanel.classList.remove('open'); showToast(t.name); };
        themeOptions.appendChild(button);
      });
    }

    function renderExportOptions() {
      exportOptions.innerHTML = '';
      Object.keys(exportStyles).forEach(function(id) {
        var s = exportStyles[id];
        var button = document.createElement('button');
        button.className = 'option';
        button.innerHTML = '<span class="option-name">' + s.name + '</span><span class="option-hint">' + s.hint + '</span>';
        button.onclick = function() { exportPanel.classList.remove('open'); exportMap(id); };
        exportOptions.appendChild(button);
      });
    }

    // ── Export ────────────────────────────────────────────────────────────
    function drawLabel(c, text, x, y, color, size, weight, align) {
      c.fillStyle = color;
      c.font = (weight || 700) + ' ' + size + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
      c.textAlign = align || 'left';
      c.fillText(text, x, y);
    }

    function exportBounds() {
      if (!explored.length) return null;
      var minLat = explored[0].lat, maxLat = explored[0].lat;
      var minLng = explored[0].lng, maxLng = explored[0].lng;
      explored.forEach(function(p) {
        minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
      });
      var center = { lat: (minLat+maxLat)/2, lng: (minLng+maxLng)/2 };
      var meters = explored.map(function(p) { return pointToMeters(p, center); });
      var minX = meters[0].x, maxX = meters[0].x, minY = meters[0].y, maxY = meters[0].y;
      meters.forEach(function(p) {
        minX = Math.min(minX, p.x - REVEAL_METERS); maxX = Math.max(maxX, p.x + REVEAL_METERS);
        minY = Math.min(minY, p.y - REVEAL_METERS); maxY = Math.max(maxY, p.y + REVEAL_METERS);
      });
      if (Math.abs(maxX-minX) < 220) { minX -= 110; maxX += 110; }
      if (Math.abs(maxY-minY) < 220) { minY -= 110; maxY += 110; }
      return { center: center, minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }

    function exportMap(styleId) {
      if (!explored.length) { showToast('还没有可导出的探索记录'); return; }
      showToast('正在生成图片...');
      setTimeout(function() {
        var out = document.createElement('canvas');
        out.width = EXPORT_WIDTH; out.height = EXPORT_HEIGHT;
        var c = out.getContext('2d');
        var b = exportBounds();
        var padX = 130, padTop = 380, padBot = 220;
        var mapW = EXPORT_WIDTH - padX*2, mapH = EXPORT_HEIGHT - padTop - padBot;
        var scale = Math.min(mapW / (b.maxX - b.minX), mapH / (b.maxY - b.minY));
        var radius = Math.max(8, REVEAL_METERS * scale);

        function project(p) {
          var m = pointToMeters(p, b.center);
          return { x: padX + (m.x - b.minX) * scale, y: EXPORT_HEIGHT - padBot - (m.y - b.minY) * scale };
        }

        drawExportBackground(c, styleId);
        drawExportDecoration(c, styleId);
        drawExportExploration(c, styleId, project, radius);
        drawExportText(c, styleId, b);

        var image = out.toDataURL('image/png');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXPORT_MAP', image: image }));
        }
      }, 60);
    }

    function drawExportBackground(c, styleId) {
      // ── Expedition ──
      if (styleId === 'expedition') {
        c.fillStyle = '#0f0f0f';
        c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        c.fillStyle = 'rgba(255,255,255,0.018)';
        for (var ni = 0; ni < 1200; ni++)
          c.fillRect(Math.random()*EXPORT_WIDTH, Math.random()*EXPORT_HEIGHT, 1, 1);
        return;
      }
      // ── Moss ──
      if (styleId === 'moss') {
        var mg = c.createLinearGradient(0, 0, 0, EXPORT_HEIGHT);
        mg.addColorStop(0, '#071209'); mg.addColorStop(1, '#0d1f0e');
        c.fillStyle = mg; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        return;
      }
      // ── Classified ──
      if (styleId === 'classified') {
        c.fillStyle = '#e2d5a0'; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        c.strokeStyle = 'rgba(100,149,237,0.22)'; c.lineWidth = 1;
        for (var gy = 140; gy < EXPORT_HEIGHT - 60; gy += 52) {
          c.beginPath(); c.moveTo(64, gy); c.lineTo(EXPORT_WIDTH-64, gy); c.stroke();
        }
        c.strokeStyle = 'rgba(204,17,0,0.40)'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(140, 60); c.lineTo(140, EXPORT_HEIGHT-60); c.stroke();
        return;
      }
      // ── Constructivist ──
      if (styleId === 'constructivist') {
        c.fillStyle = '#f4e7c1'; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        c.fillStyle = '#0b0b0b'; c.beginPath(); c.moveTo(0,0); c.lineTo(500,0); c.lineTo(0,620); c.fill();
        c.fillStyle = '#d83424'; c.beginPath(); c.moveTo(EXPORT_WIDTH,0); c.lineTo(EXPORT_WIDTH,520); c.lineTo(430,EXPORT_HEIGHT); c.lineTo(240,EXPORT_HEIGHT); c.fill();
        c.fillStyle = '#0b7f86'; c.beginPath(); c.moveTo(0,1280); c.lineTo(350,EXPORT_HEIGHT); c.lineTo(0,EXPORT_HEIGHT); c.fill();
        return;
      }
      // ── Night ──
      if (styleId === 'night') {
        var ng = c.createLinearGradient(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        ng.addColorStop(0, '#020617'); ng.addColorStop(1, '#172554');
        c.fillStyle = ng; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        return;
      }
      // ── Atlas ──
      if (styleId === 'atlas') {
        c.fillStyle = '#eef6f4'; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        return;
      }
      // ── Parchment (default) ──
      c.fillStyle = '#ead29a'; c.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
      c.fillStyle = 'rgba(93,58,31,0.08)';
      for (var i = 0; i < 70; i++) {
        c.beginPath(); c.arc(Math.random()*EXPORT_WIDTH, Math.random()*EXPORT_HEIGHT, 1+Math.random()*4, 0, Math.PI*2); c.fill();
      }
    }

    function drawExportDecoration(c, styleId) {
      // ── Expedition ──
      if (styleId === 'expedition') {
        c.strokeStyle = '#b8860b'; c.lineWidth = 3;
        c.strokeRect(52, 52, EXPORT_WIDTH-104, EXPORT_HEIGHT-104);
        c.strokeStyle = 'rgba(184,134,11,0.35)'; c.lineWidth = 1;
        c.strokeRect(64, 64, EXPORT_WIDTH-128, EXPORT_HEIGHT-128);
        // corner accents
        var cs = 40;
        [52,EXPORT_WIDTH-52].forEach(function(cx) {
          [52,EXPORT_HEIGHT-52].forEach(function(cy) {
            var sx = cx === 52 ? 1 : -1, sy = cy === 52 ? 1 : -1;
            c.strokeStyle = '#b8860b'; c.lineWidth = 4;
            c.beginPath(); c.moveTo(cx, cy+sy*cs); c.lineTo(cx, cy); c.lineTo(cx+sx*cs, cy); c.stroke();
          });
        });
        return;
      }
      // ── Moss ──
      if (styleId === 'moss') {
        c.strokeStyle = 'rgba(132,204,22,0.55)'; c.lineWidth = 5;
        var bx=58, by=58, bw=EXPORT_WIDTH-116, bh=EXPORT_HEIGHT-116;
        c.beginPath();
        c.moveTo(bx, by+4); c.quadraticCurveTo(bx+bw/2, by-3, bx+bw, by+3);
        c.quadraticCurveTo(bx+bw+4, by+bh/2, bx+bw-2, by+bh);
        c.quadraticCurveTo(bx+bw/2, by+bh+3, bx, by+bh-2);
        c.quadraticCurveTo(bx-3, by+bh/2, bx, by);
        c.stroke();
        return;
      }
      // ── Classified ──
      if (styleId === 'classified') {
        c.strokeStyle = '#1a1a1a'; c.lineWidth = 4;
        c.strokeRect(56, 56, EXPORT_WIDTH-112, EXPORT_HEIGHT-112);
        c.strokeStyle = 'rgba(26,26,26,0.5)'; c.lineWidth = 2;
        [280, 960, 1640].forEach(function(py) {
          c.beginPath(); c.arc(105, py, 18, 0, Math.PI*2); c.stroke();
        });
        return;
      }
      // ── Constructivist ──
      if (styleId === 'constructivist') {
        c.strokeStyle = '#0b0b0b'; c.lineWidth = 16;
        c.strokeRect(46, 46, EXPORT_WIDTH-92, EXPORT_HEIGHT-92);
        c.strokeStyle = 'rgba(11,11,11,0.26)'; c.lineWidth = 4;
        for (var x = -700; x < EXPORT_WIDTH; x += 90) {
          c.beginPath(); c.moveTo(x, EXPORT_HEIGHT); c.lineTo(x+EXPORT_WIDTH, 0); c.stroke();
        }
        return;
      }
      // ── Night ──
      if (styleId === 'night') {
        c.strokeStyle = 'rgba(167,139,250,0.34)'; c.lineWidth = 6;
        c.strokeRect(58, 58, EXPORT_WIDTH-116, EXPORT_HEIGHT-116);
        return;
      }
      // ── Atlas ──
      if (styleId === 'atlas') {
        c.strokeStyle = '#164e63'; c.lineWidth = 5;
        c.strokeRect(58, 58, EXPORT_WIDTH-116, EXPORT_HEIGHT-116);
        c.strokeStyle = 'rgba(20,83,45,0.14)'; c.lineWidth = 2;
        for (var gx = 120; gx < EXPORT_WIDTH; gx += 120) { c.beginPath(); c.moveTo(gx,90); c.lineTo(gx,EXPORT_HEIGHT-90); c.stroke(); }
        for (var gy2 = 120; gy2 < EXPORT_HEIGHT; gy2 += 120) { c.beginPath(); c.moveTo(90,gy2); c.lineTo(EXPORT_WIDTH-90,gy2); c.stroke(); }
        return;
      }
      // ── Parchment (default) ──
      c.strokeStyle = '#4a2e18'; c.lineWidth = 10;
      c.strokeRect(54, 54, EXPORT_WIDTH-108, EXPORT_HEIGHT-108);
      c.strokeStyle = 'rgba(74,46,24,0.45)'; c.lineWidth = 3; c.setLineDash([12,10]);
      c.strokeRect(78, 78, EXPORT_WIDTH-156, EXPORT_HEIGHT-156);
      c.setLineDash([]);
    }

    function drawExportExploration(c, styleId, project, radius) {
      // ── Expedition ──
      if (styleId === 'expedition') {
        c.save();
        c.fillStyle = 'rgba(251,191,36,0.42)';
        explored.forEach(function(p) { var pt=project(p); c.beginPath(); c.arc(pt.x,pt.y,radius,0,Math.PI*2); c.fill(); });
        if (explored.length > 1) {
          c.strokeStyle = 'rgba(255,255,255,0.72)'; c.lineWidth = 6; c.lineJoin='round'; c.lineCap='round';
          c.beginPath();
          explored.forEach(function(p,i) { var pt=project(p); if(i===0) c.moveTo(pt.x,pt.y); else c.lineTo(pt.x,pt.y); });
          c.stroke();
        }
        var fp = project(explored[0]);
        c.fillStyle = '#3b82f6'; c.strokeStyle='#fff'; c.lineWidth=8;
        c.beginPath(); c.arc(fp.x,fp.y,20,0,Math.PI*2); c.fill(); c.stroke();
        var lp = project(explored[explored.length-1]);
        c.fillStyle = '#f59e0b'; c.strokeStyle='#fff'; c.lineWidth=10;
        c.beginPath(); c.arc(lp.x,lp.y,26,0,Math.PI*2); c.fill(); c.stroke();
        c.restore(); return;
      }
      // ── Moss ──
      if (styleId === 'moss') {
        c.save();
        c.fillStyle = 'rgba(132,204,22,0.60)';
        explored.forEach(function(p) { var pt=project(p); c.beginPath(); c.arc(pt.x,pt.y,radius,0,Math.PI*2); c.fill(); });
        if (explored.length > 1) {
          c.strokeStyle = '#65a30d'; c.lineWidth=7; c.lineJoin='round'; c.lineCap='round';
          c.beginPath();
          explored.forEach(function(p,i) { var pt=project(p); if(i===0) c.moveTo(pt.x,pt.y); else c.lineTo(pt.x,pt.y); });
          c.stroke();
        }
        var lm = project(explored[explored.length-1]);
        c.fillStyle='#84cc16'; c.strokeStyle='#fff'; c.lineWidth=8;
        c.beginPath(); c.arc(lm.x,lm.y,22,0,Math.PI*2); c.fill(); c.stroke();
        c.restore(); return;
      }
      // ── Classified ──
      if (styleId === 'classified') {
        c.save();
        c.fillStyle = 'rgba(204,17,0,0.75)';
        explored.forEach(function(p) { var pt=project(p); c.beginPath(); c.arc(pt.x,pt.y,radius,0,Math.PI*2); c.fill(); });
        if (explored.length > 1) {
          c.strokeStyle='#8b0000'; c.lineWidth=6; c.lineJoin='round'; c.lineCap='round';
          c.beginPath();
          explored.forEach(function(p,i) { var pt=project(p); if(i===0) c.moveTo(pt.x,pt.y); else c.lineTo(pt.x,pt.y); });
          c.stroke();
        }
        var lc = project(explored[explored.length-1]);
        c.fillStyle='#cc1100'; c.strokeStyle='#1a1a1a'; c.lineWidth=8;
        c.beginPath(); c.arc(lc.x,lc.y,22,0,Math.PI*2); c.fill(); c.stroke();
        // crosshair
        c.strokeStyle='#1a1a1a'; c.lineWidth=3;
        c.beginPath(); c.moveTo(lc.x-38,lc.y); c.lineTo(lc.x+38,lc.y); c.stroke();
        c.beginPath(); c.moveTo(lc.x,lc.y-38); c.lineTo(lc.x,lc.y+38); c.stroke();
        c.restore(); return;
      }

      // ── Existing styles ───────────────────────────────────────────────
      c.save();
      if (styleId === 'constructivist') {
        c.globalAlpha = 0.96; c.fillStyle = '#19a7aa';
      } else if (styleId === 'night') {
        c.shadowColor = '#67e8f9'; c.shadowBlur = 22; c.fillStyle = 'rgba(34,211,238,0.74)';
      } else if (styleId === 'atlas') {
        c.fillStyle = 'rgba(20,184,166,0.62)';
      } else {
        c.fillStyle = 'rgba(54,132,105,0.60)';
      }
      explored.forEach(function(p) { var pt=project(p); c.beginPath(); c.arc(pt.x,pt.y,radius,0,Math.PI*2); c.fill(); });
      c.restore();

      if (explored.length > 1) {
        c.save(); c.lineJoin='round'; c.lineCap='round';
        c.lineWidth = styleId==='constructivist' ? 13 : 8;
        c.strokeStyle = styleId==='constructivist' ? '#d83424' : (styleId==='night' ? '#e0e7ff' : '#2b4638');
        c.beginPath();
        explored.forEach(function(p,i) { var pt=project(p); if(i===0) c.moveTo(pt.x,pt.y); else c.lineTo(pt.x,pt.y); });
        c.stroke(); c.restore();
      }

      var last = project(explored[explored.length-1]);
      c.save();
      c.fillStyle = styleId==='constructivist' ? '#d83424' : '#0ea5e9';
      c.strokeStyle = '#ffffff'; c.lineWidth = 10;
      c.beginPath(); c.arc(last.x,last.y,24,0,Math.PI*2); c.fill(); c.stroke();
      c.restore();
    }

    function drawExportText(c, styleId, b) {
      // ── Expedition ──
      if (styleId === 'expedition') {
        c.fillStyle = '#ffffff';
        c.font = '900 52px -apple-system, sans-serif'; c.textAlign = 'left';
        c.fillText('MAPEXPLORER', 92, 132);
        c.fillStyle = '#b8860b';
        c.font = '600 24px -apple-system, sans-serif';
        c.fillText('EXPEDITION LOG', 92, 172);
        c.fillStyle = 'rgba(255,255,255,0.50)';
        c.font = '600 22px -apple-system, sans-serif';
        c.fillText('EXPLORED', 92, 248);
        c.fillStyle = '#ffffff';
        c.font = '900 68px -apple-system, sans-serif';
        c.fillText(formatArea(areaSquareMeters), 92, 324);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.font = '500 21px "Courier New", monospace'; c.textAlign = 'right';
        c.fillText(explored.length + ' GPS points', EXPORT_WIDTH-92, EXPORT_HEIGHT-112);
        if (b && b.center) {
          c.fillText(b.center.lat.toFixed(4) + '° N   ' + b.center.lng.toFixed(4) + '° E', EXPORT_WIDTH-92, EXPORT_HEIGHT-80);
        }
        return;
      }
      // ── Moss ──
      if (styleId === 'moss') {
        c.fillStyle = '#f0fff0';
        c.font = '900 52px -apple-system, sans-serif'; c.textAlign = 'left';
        c.fillText('MapExplorer', 92, 132);
        c.fillStyle = 'rgba(132,204,22,0.85)';
        c.font = '600 26px -apple-system, sans-serif';
        c.fillText('Trail Map', 92, 174);
        c.fillStyle = 'rgba(255,255,255,0.48)';
        c.font = '600 22px -apple-system, sans-serif';
        c.fillText('TOTAL AREA', 92, 252);
        c.fillStyle = '#84cc16';
        c.font = '900 68px -apple-system, sans-serif';
        c.fillText(formatArea(areaSquareMeters), 92, 328);
        c.fillStyle = 'rgba(255,255,255,0.36)';
        c.font = '500 22px -apple-system, sans-serif'; c.textAlign = 'right';
        c.fillText(explored.length + ' waypoints', EXPORT_WIDTH-92, EXPORT_HEIGHT-82);
        return;
      }
      // ── Classified ──
      if (styleId === 'classified') {
        c.fillStyle = '#1a1a1a';
        c.font = '700 26px "Courier New", monospace'; c.textAlign = 'left';
        c.fillText('FIELD EXPLORATION REPORT', 160, 112);
        // redaction bar over subtitle
        c.fillStyle = '#1a1a1a'; c.fillRect(160, 126, 520, 30);
        c.fillStyle = 'rgba(26,26,26,0.55)';
        c.font = '600 21px "Courier New", monospace';
        c.fillText('AREA COVERED:', 160, 216);
        c.fillStyle = '#cc1100';
        c.font = '900 64px -apple-system, sans-serif';
        c.fillText(formatArea(areaSquareMeters), 160, 290);
        c.fillStyle = 'rgba(26,26,26,0.55)';
        c.font = '600 20px "Courier New", monospace';
        c.fillText('GPS WAYPOINTS: ' + explored.length, 160, 340);
        var now = new Date();
        c.fillText('DATE: ' + now.getFullYear() + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + String(now.getDate()).padStart(2,'0'), 160, 376);
        // CLASSIFIED stamp
        c.save();
        c.translate(EXPORT_WIDTH/2 + 60, 680); c.rotate(-0.14);
        c.font = '900 108px Impact, Arial Black, sans-serif'; c.textAlign = 'center';
        c.strokeStyle = 'rgba(204,17,0,0.82)'; c.lineWidth = 8;
        c.strokeText('CLASSIFIED', 0, 0);
        c.fillStyle = 'rgba(204,17,0,0.10)';
        c.fillText('CLASSIFIED', 0, 0);
        c.restore();
        // bottom ref
        c.fillStyle = 'rgba(26,26,26,0.50)';
        c.font = '500 17px "Courier New", monospace'; c.textAlign = 'right';
        c.fillText('REF: MAPEXP-' + explored.length + '-' + Math.abs(Math.floor(areaSquareMeters)), EXPORT_WIDTH-92, EXPORT_HEIGHT-110);
        c.fillStyle = 'rgba(204,17,0,0.45)';
        c.font = '600 16px "Courier New", monospace'; c.textAlign = 'center';
        c.fillText('DECLASSIFIED PER EXECUTIVE ORDER 12958', EXPORT_WIDTH/2, EXPORT_HEIGHT-80);
        return;
      }
      // ── Existing styles ───────────────────────────────────────────────
      var dark  = styleId === 'night' ? '#f8fafc' : '#171717';
      var muted = styleId === 'night' ? 'rgba(248,250,252,0.68)' : 'rgba(23,23,23,0.62)';
      drawLabel(c, 'MapExplorer', 92, 132, dark, 46, 900, 'left');
      drawLabel(c, 'Explored Area', 92, 190, muted, 26, 700, 'left');
      drawLabel(c, formatArea(areaSquareMeters), 92, 252, dark, 64, 900, 'left');
      drawLabel(c, explored.length + ' GPS points', EXPORT_WIDTH-92, EXPORT_HEIGHT-96, muted, 25, 700, 'right');
    }

    // ── Message handling (React Native) ───────────────────────────────────
    function handleRNMessage(event) {
      var data;
      try { data = JSON.parse(event.data); } catch(e) { return; }
      if (data.type === 'RESTORE') {
        statusEl.textContent = '恢复探索记录...';
        (data.points || []).forEach(function(p) { addExploredPoint(p.lat, p.lng); });
        redraw();
        if (activeThemeId === 'terminal') {
          statusEl.textContent = explored.length ? '> TRACKING_' : '> LOCATING_';
        } else {
          statusEl.textContent = explored.length ? '探索中' : '正在定位...';
        }
      }
    }

    // ── Event listeners ───────────────────────────────────────────────────
    document.getElementById('themeButton').onclick  = function() { togglePanel(themePanel); };
    document.getElementById('exportButton').onclick = function() { togglePanel(exportPanel); };
    document.querySelectorAll('[data-close]').forEach(function(button) {
      button.onclick = function() {
        document.getElementById(button.getAttribute('data-close')).classList.remove('open');
      };
    });

    map.on('move', redraw);
    map.on('zoom', redraw);
    window.addEventListener('resize', resize);
    window.addEventListener('message', handleRNMessage);
    document.addEventListener('message', handleRNMessage);

    renderThemeOptions();
    renderExportOptions();
    applyTheme(activeThemeId);
    resize();

    // ── GPS ───────────────────────────────────────────────────────────────
    function onPosition(pos) {
      var gcj = wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude);
      var lat = gcj.lat, lng = gcj.lng;

      if (!mapInitialized) {
        mapInitialized = true;
        map.setView([lat, lng], 16);
        statusEl.textContent = activeThemeId === 'terminal' ? '> TRACKING_' : '探索中';
      }

      playerPos = [lat, lng];
      var added = addExploredPoint(lat, lng);
      erasePoint(lat, lng);
      updatePlayer();

      if (added && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATION_UPDATE', lat: lat, lng: lng }));
      }
    }

    function onPositionError(err) {
      statusEl.textContent = activeThemeId === 'terminal'
        ? '> ERR(' + err.code + ')_'
        : '定位失败(' + err.code + '): ' + err.message;
      console.log('Geo error', err.code, err.message);
    }

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(onPosition, onPositionError, {
        enableHighAccuracy: true, timeout: 30000, maximumAge: 10000
      });
    } else {
      statusEl.textContent = activeThemeId === 'terminal' ? '> NO_GPS_' : '此设备不支持定位';
    }
  <\/script>
</body>
</html>`;

export default mapHtml;
