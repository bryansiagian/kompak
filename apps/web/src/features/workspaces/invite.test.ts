import { describe, expect, it } from 'vitest';
import {
  buildInviteLink,
  extractInviteCode,
  whatsAppShareUrl,
} from './invite';

describe('invite', () => {
  it('membangun tautan undangan', () => {
    expect(buildInviteLink('http://localhost:3000', 'ABCD2345')).toBe(
      'http://localhost:3000/join/ABCD2345',
    );
  });

  it('tautan WhatsApp meng-encode teks dengan benar', () => {
    const text = 'Yuk gabung: http://x/join/ABC?a=1&b=2';
    const url = whatsAppShareUrl(text);
    const prefix = 'https://wa.me/?text=';
    expect(url.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(url.slice(prefix.length))).toBe(text);
  });

  it('mengambil kode dari kode biasa, huruf kecil, atau tautan penuh', () => {
    expect(extractInviteCode('ABCD2345')).toBe('ABCD2345');
    expect(extractInviteCode('  abcd2345  ')).toBe('ABCD2345');
    expect(
      extractInviteCode('https://kompak.app/join/abcd2345?utm=wa#x'),
    ).toBe('ABCD2345');
    expect(extractInviteCode('')).toBe('');
  });
});