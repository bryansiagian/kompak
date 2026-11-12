import { describe, expect, it } from 'vitest';
import {
  canChangeRoles,
  canDeleteCard,
  canManage,
  canRemoveMember,
} from './permissions';

const owner = { userId: 'o', role: 'OWNER' as const };
const admin = { userId: 'a', role: 'ADMIN' as const };
const otherAdmin = { userId: 'a2', role: 'ADMIN' as const };
const member = { userId: 'm', role: 'MEMBER' as const };
const otherMember = { userId: 'm2', role: 'MEMBER' as const };

describe('permissions', () => {
  it('Ketua dan Pengelola boleh mengelola, Anggota tidak', () => {
    expect(canManage('OWNER')).toBe(true);
    expect(canManage('ADMIN')).toBe(true);
    expect(canManage('MEMBER')).toBe(false);
  });

  it('hanya Ketua yang boleh mengubah peran', () => {
    expect(canChangeRoles('OWNER')).toBe(true);
    expect(canChangeRoles('ADMIN')).toBe(false);
    expect(canChangeRoles('MEMBER')).toBe(false);
  });

  it('Ketua bisa mengeluarkan Pengelola dan Anggota, tetapi tidak Ketua', () => {
    expect(canRemoveMember(owner, admin)).toBe(true);
    expect(canRemoveMember(owner, member)).toBe(true);
    expect(canRemoveMember(admin, owner)).toBe(false);
    expect(canRemoveMember(owner, owner)).toBe(false);
  });

  it('Pengelola hanya bisa mengeluarkan Anggota biasa', () => {
    expect(canRemoveMember(admin, member)).toBe(true);
    expect(canRemoveMember(admin, otherAdmin)).toBe(false);
  });

  it('Anggota tidak bisa mengeluarkan orang lain, tetapi bisa keluar sendiri', () => {
    expect(canRemoveMember(member, otherMember)).toBe(false);
    expect(canRemoveMember(member, member)).toBe(true);
  });

  it('tugas hanya bisa dihapus pembuatnya, Pengelola, atau Ketua', () => {
    expect(canDeleteCard(member, { createdById: 'm' })).toBe(true);
    expect(canDeleteCard(member, { createdById: 'm2' })).toBe(false);
    expect(canDeleteCard(admin, { createdById: 'm2' })).toBe(true);
    expect(canDeleteCard(owner, { createdById: 'm2' })).toBe(true);
  });
});