const { extractFileId } = require('../file.utils');

describe('extractFileId', () => {
  test('extracts id from ?id= query param', () => {
    expect(extractFileId('https://drive.google.com/open?id=abc123')).toBe('abc123');
  });

  test('extracts id from /d/ format', () => {
    expect(extractFileId('https://drive.google.com/file/d/xyz789/view')).toBe('xyz789');
  });

  test('prefers ?id= over /d/ when both present', () => {
    expect(extractFileId('https://drive.google.com/file/d/xyz789/view?id=abc123')).toBe('abc123');
  });

  test('throws Error for invalid URL', () => {
    expect(() => extractFileId('https://example.com/no-id')).toThrow(Error);
  });

  test('throws Error for empty string', () => {
    expect(() => extractFileId('')).toThrow(Error);
  });

  test('handles &id= in query string', () => {
    expect(extractFileId('https://example.com/file?foo=bar&id=myid')).toBe('myid');
  });
});
