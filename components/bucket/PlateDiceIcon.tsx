import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type PlateDiceIconProps = {
  size?: number;
  color?: string;
  /** 주사위 안쪽을 칠할 색 (뒤의 접시 선을 가린다). 아이콘이 놓인 배경색을 넣는다 */
  cutout?: string;
  strokeWidth?: number;
};

/**
 * '오늘 뭐 하지' 아이콘: 포크·접시·숟가락 오른쪽 아래에 작은 주사위.
 * lucide 아이콘과 같은 24 격자·둥근 선이라 탭바의 다른 아이콘과 어울린다.
 */
export function PlateDiceIcon({
  size = 24,
  color = 'currentColor',
  cutout = 'transparent',
  strokeWidth = 2,
}: PlateDiceIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 포크 */}
      <Path d="M2.5 3v3.5a1.5 1.5 0 0 0 3 0V3M4 3v3M4 8v13" />
      {/* 접시 (바깥·안쪽 테두리) */}
      <Circle cx={12} cy={12} r={6} />
      <Circle cx={12} cy={12} r={3.2} strokeWidth={strokeWidth * 0.75} />
      {/* 숟가락 */}
      <Ellipse cx={20.5} cy={5.5} rx={1.6} ry={2.5} />
      <Path d="M20.5 8v13" />
      {/* 주사위 (안쪽을 배경색으로 칠해 접시 선을 가린다) */}
      <Rect x={12.5} y={13.5} width={6.5} height={6.5} rx={1.6} fill={cutout} />
      <Circle cx={14.6} cy={15.6} r={0.6} fill={color} stroke="none" />
      <Circle cx={16.9} cy={17.9} r={0.6} fill={color} stroke="none" />
    </Svg>
  );
}
