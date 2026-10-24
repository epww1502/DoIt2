/**
 * UUID v4 만들기. 항목·사진 이름용이라 보안용 난수까지는 필요 없다.
 * 네이티브 모듈(expo-crypto)에 기대지 않아서 어느 앱(Expo Go 포함)에서도 돈다.
 */
export function randomUUID(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = (
    globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }
  ).crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // 버전(4)과 변형(10xx) 비트
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
