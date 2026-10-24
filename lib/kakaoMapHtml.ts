/**
 * 앱 안 WebView에 띄우는 카카오 웹 지도 HTML.
 * 앱 → 지도: window.DoIt2.setMarkers / panTo / highlight 를 injectJavaScript로 부른다.
 * 지도 → 앱: ReactNativeWebView.postMessage(JSON) 로 알린다.
 *   { type: 'ready' }                         지도 준비됨
 *   { type: 'center', latitude, longitude }   지도를 다 움직인 뒤 가운데 좌표
 *   { type: 'select', index }                 결과 핀을 누름
 *   { type: 'mapPress' }                      빈 곳을 누름
 *   { type: 'error', message }                SDK를 못 불러옴 (키·도메인 문제 등)
 *
 * 카카오 웹 지도는 등록된 사이트 도메인에서만 열려서, WebView의 baseUrl과
 * 카카오 개발자 콘솔 > 플랫폼 > Web 에 같은 도메인(KAKAO_MAP_BASE_URL)을 등록해야 한다.
 */

// 앱 안 지도 페이지에 붙이는 주소 이름표. 실제로 접속하지 않으며 도메인을 가지고 있을 필요도 없다.
// 카카오 개발자 콘솔 > 플랫폼 > Web 에 이 주소를 그대로 등록해야 지도가 열린다.
export const KAKAO_MAP_BASE_URL = 'https://map.doit2.app';

type KakaoMapHtmlOptions = {
  jsKey: string;
  latitude: number;
  longitude: number;
  /** 지도 아래를 가리는 카드 높이만큼 핀들을 위로 모아 보이게 하는 여백(px) */
  bottomPadding: number;
};

export function kakaoMapHtml({
  jsKey,
  latitude,
  longitude,
  bottomPadding,
}: KakaoMapHtmlOptions) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }</style>
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
  var map = null;
  var markers = [];

  window.DoIt2 = {
    setMarkers: function (places) {
      if (!map) return;
      markers.forEach(function (m) { m.setMap(null); });
      markers = [];
      if (!places.length) return;
      var bounds = new kakao.maps.LatLngBounds();
      places.forEach(function (p, i) {
        var position = new kakao.maps.LatLng(p.latitude, p.longitude);
        var marker = new kakao.maps.Marker({ position: position, map: map });
        kakao.maps.event.addListener(marker, 'click', function () {
          send({ type: 'select', index: i });
        });
        markers.push(marker);
        bounds.extend(position);
      });
      // 위·오른쪽·아래·왼쪽 여백 (아래는 결과 카드 높이만큼)
      map.setBounds(bounds, 60, 40, ${Math.round(bottomPadding)}, 40);
    },
    panTo: function (lat, lng) {
      if (!map) return;
      map.setLevel(4);
      map.panTo(new kakao.maps.LatLng(lat, lng));
    },
    highlight: function (index) {
      markers.forEach(function (m, j) { m.setZIndex(j === index ? 10 : 1); });
      if (index >= 0 && markers[index]) map.panTo(markers[index].getPosition());
    },
  };

  if (!window.kakao || !kakao.maps) {
    send({ type: 'error', message: 'sdk_missing' });
  } else {
    kakao.maps.load(function () {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${latitude}, ${longitude}),
        level: 4,
      });
      kakao.maps.event.addListener(map, 'idle', function () {
        var c = map.getCenter();
        send({ type: 'center', latitude: c.getLat(), longitude: c.getLng() });
      });
      kakao.maps.event.addListener(map, 'click', function () {
        send({ type: 'mapPress' });
      });
      send({ type: 'ready' });
    });
  }
</script>
</body>
</html>`;
}
