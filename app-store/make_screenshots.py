"""App Store 스크린샷 만들기: raw/ 의 시뮬레이터 캡처(1320x2868)를 파란 배경 + 제목 + 폰 틀로 감싼다.

필요: Pillow (pip install Pillow)
실행: python app-store/make_screenshots.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT.parent / 'assets' / 'fonts'
W, H = 1320, 2868  # iPhone 6.9인치
BG = '#5AB0FF'
FRAME = '#9ED0FF'

SHOTS = [
    ('01-bucketlist', '가고 싶은 곳, 해보고 싶은 일', '함께 담아두는 우리의 버킷리스트'),
    ('02-pick', '오늘 뭐 하지? 고민될 땐 뽑기', '비 오는 날엔 실외는 빼고 골라줘요'),
    ('03-done', '함께한 순간을 기록해요', '별점과 한 줄 후기로 남겨요'),
    ('04-map', '함께 다녀온 곳을 지도에', '가본 곳이 하나씩 핀으로 쌓여요'),
    ('05-calendar', '달력으로 돌아보는 우리', '함께한 날이 한눈에 보여요'),
    ('06-memories', '추억을 모아봐요', '달마다 얼마나 함께했는지 한눈에'),
]

title_font = ImageFont.truetype(str(FONTS / 'Pretendard-Bold.otf'), 104)
sub_font = ImageFont.truetype(str(FONTS / 'Pretendard-SemiBold.otf'), 58)

# 폰 화면 크기와 위치
SCALE = 0.74
SW, SH = round(W * SCALE), round(H * SCALE)
BORDER = 20
RADIUS = 120
SX, SY = (W - SW) // 2, 600


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def make(name, title, sub):
    canvas = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    draw.text((W / 2, 260), title, font=title_font, fill='white', anchor='mm')
    draw.text((W / 2, 400), sub, font=sub_font, fill='#E6F3FF', anchor='mm')

    # 폰 틀: 연한 테두리 → 화면
    draw.rounded_rectangle(
        (SX - BORDER, SY - BORDER, SX + SW + BORDER, SY + SH + BORDER),
        RADIUS + BORDER,
        fill=FRAME,
    )
    screen = Image.open(ROOT / 'raw' / f'{name}.png').convert('RGB').resize((SW, SH), Image.LANCZOS)
    canvas.paste(screen, (SX, SY), rounded_mask((SW, SH), RADIUS))

    out = ROOT / 'screenshots' / f'{name}.png'
    canvas.save(out)
    assert Image.open(out).size == (W, H), f'{out} 크기가 {W}x{H}가 아니다'
    return out


if __name__ == '__main__':
    (ROOT / 'screenshots').mkdir(exist_ok=True)
    for shot in SHOTS:
        print(make(*shot))
