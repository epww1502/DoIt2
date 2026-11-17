/**
 * 안드로이드 홈 화면 위젯이 저절로 다시 그려지게 하는 설정 플러그인.
 *
 * expo-widgets는 위젯의 자동 갱신 주기를 0(꺼짐)으로 만든다. 그러면 앱을 열거나 위젯의 버튼을 누를 때만
 * 위젯이 다시 그려져서, 날짜가 바뀌어도 D-day가 어제 숫자로 남는다.
 * 여기서 그 주기를 30분(안드로이드가 허용하는 가장 짧은 값)으로 바꾼다. 위젯은 다시 그려질 때
 * 오늘 날짜의 값을 스스로 고르므로(widgets/android.tsx), 자정이 지나고 늦어도 30분쯤 뒤에는 맞게 바뀐다.
 *
 * app.json에서 expo-widgets보다 '앞에' 적어야 한다 (파일을 고치는 설정은 뒤에 적은 것이 먼저 돌아서,
 * 앞에 적어야 expo-widgets가 파일을 만든 뒤에 고칠 수 있다).
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PERIOD_MS = 30 * 60 * 1000;

module.exports = function withWidgetAutoRefresh(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      if (!fs.existsSync(dir)) return cfg;
      for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        const xml = fs.readFileSync(full, 'utf8');
        if (!xml.includes('<appwidget-provider')) continue;
        fs.writeFileSync(
          full,
          xml.replace(
            /android:updatePeriodMillis="\d+"/,
            `android:updatePeriodMillis="${PERIOD_MS}"`
          )
        );
      }
      return cfg;
    },
  ]);
};
