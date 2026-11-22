import { FAQ_GROUPS, FAQ_TAB_HREFS, faqContactUrl } from '@/lib/faq';

const items = FAQ_GROUPS.flatMap((group) => group.items);
const hrefs = items.flatMap((item) =>
  (item.paths ?? []).flatMap((steps) =>
    steps.flatMap((step) => (step.href ? [step.href] : []))
  )
);

describe('도움말 내용', () => {
  it('question ids are unique and safe to count', () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z_]{1,20}$/);
  });

  // 화면이 실제로 있는지는 타입 검사가 본다 (FaqStep.href가 Href)
  it('has steps you can tap, and every tab step is a known tab', () => {
    expect(hrefs.length).toBeGreaterThan(0);
    for (const tab of FAQ_TAB_HREFS) expect(hrefs).toContain(tab);
  });

  it('counting a tapped step fits the 40-character detail limit', () => {
    for (const item of items) {
      for (const steps of item.paths ?? []) {
        for (const step of steps) {
          if (step.href) {
            expect(
              `${item.id}:${String(step.href)}`.length
            ).toBeLessThanOrEqual(40);
          }
        }
      }
    }
  });

  it('builds a mail link with the version and platform in the subject', () => {
    const url = faqContactUrl('0.3.0', 'android');
    expect(url.startsWith('mailto:doit2team@gmail.com?subject=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('v0.3.0, android');
  });
});
