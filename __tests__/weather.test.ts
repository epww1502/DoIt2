import { fetchOpenMeteo } from '@/lib/weather';

const params = new URLSearchParams({ latitude: '37.5', longitude: '127' });
const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe('fetchOpenMeteo', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('returns the response when the first request works', async () => {
    fetchMock.mockResolvedValueOnce(ok({ a: 1 }));
    await expect(fetchOpenMeteo(params)).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks once more when the connection fails', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Software caused connection abort'))
      .mockResolvedValueOnce(ok({ a: 2 }));
    await expect(fetchOpenMeteo(params)).resolves.toEqual({ a: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second failure', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    await expect(fetchOpenMeteo(params)).rejects.toThrow(
      'Network request failed'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not ask again when the server refuses', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchOpenMeteo(params)).rejects.toThrow('weather 500');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
