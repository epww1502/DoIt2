/**
 * 할 것 코스 지도: 위치가 있는 할 것을 순서대로 번호 핀으로 찍고 선으로 잇는다.
 * 지도 → 앱: { type: 'ready' } / { type: 'select', index } / { type: 'error', message }
 * 카카오 웹 지도 도메인 규칙은 kakaoMapHtml.ts와 같다 (KAKAO_MAP_BASE_URL).
 */
type CourseStop = { latitude: number; longitude: number };

type KakaoCourseHtmlOptions = {
  jsKey: string;
  stops: CourseStop[];
  /** 번호 핀 색 (테마색) */
  color: string;
  /** 지도 아래를 가리는 목록 높이만큼 핀들을 위로 모으는 여백(px) */
  bottomPadding: number;
};

export function kakaoCourseHtml({
  jsKey,
  stops,
  color,
  bottomPadding,
}: KakaoCourseHtmlOptions) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  .stop {
    width: 30px; height: 30px; border-radius: 15px;
    background: ${color}; color: #fff; border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    font: 700 14px/30px -apple-system, sans-serif; text-align: center;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function send(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  window.onerror = function (message) {
    send({ type: 'error', message: String(message) });
  };
</script>
<script
  src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(jsKey)}&autoload=false"
  onerror="send({ type: 'error', message: 'sdk_load_failed' })"
></script>
<script>
  var stops = ${JSON.stringify(stops)};
  if (!window.kakao || !kakao.maps) {
    send({ type: 'error', message: 'sdk_missing' });
  } else {
    kakao.maps.load(function () {
      var first = stops[0] || { latitude: 37.5663, longitude: 126.9779 };
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(first.latitude, first.longitude),
        level: 5,
      });
      var bounds = new kakao.maps.LatLngBounds();
      var path = [];
      stops.forEach(function (s, i) {
        var position = new kakao.maps.LatLng(s.latitude, s.longitude);
        path.push(position);
        bounds.extend(position);
        var el = document.createElement('div');
        el.className = 'stop';
        el.textContent = String(i + 1);
        el.onclick = function () { send({ type: 'select', index: i }); };
        new kakao.maps.CustomOverlay({
          position: position, content: el, yAnchor: 0.5, zIndex: 10 + i, map: map,
        });
      });
      if (path.length > 1) {
        new kakao.maps.Polyline({
          map: map, path: path, strokeWeight: 4, strokeColor: '${color}',
          strokeOpacity: 0.8, strokeStyle: 'shortdash',
        });
      }
      if (stops.length > 1) {
        map.setBounds(bounds, 60, 40, ${Math.round(bottomPadding)}, 40);
      }
      send({ type: 'ready' });
    });
  }
</script>
</body>
</html>`;
}
