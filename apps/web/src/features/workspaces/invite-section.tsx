'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { WorkspaceDetail } from '@kompak/shared';
import { Button, buttonClassName } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from './errors';
import { useRegenerateInvite } from './hooks';
import { buildInviteLink, whatsAppShareUrl } from './invite';
import { canManage } from './permissions';

type CopyState = 'idle' | 'copied' | 'failed';

export function InviteSection({ workspace }: { workspace: WorkspaceDetail }) {
  const t = useTranslations('groups');
  const regenerate = useRegenerateInvite();
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState !== 'copied') {
      return undefined;
    }
    const timer = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  // Komponen ini hanya tampil setelah data dimuat di peramban, jadi window tersedia.
  const link = buildInviteLink(window.location.origin, workspace.inviteCode);
  const shareText = t('invite.shareText', { name: workspace.name, link });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <Section title={t('invite.title')} description={t('invite.description')}>
      <div className="space-y-3">
        <TextField
          label={t('invite.linkLabel')}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
        <p className="text-sm text-stone-600">
          {t('invite.codeLabel', { code: workspace.inviteCode })}
        </p>

        <a
          href={whatsAppShareUrl(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClassName('primary', true)} inline-flex items-center justify-center`}
        >
          {t('invite.whatsapp')}
        </a>
        <Button variant="secondary" fullWidth onClick={handleCopy}>
          {copyState === 'copied' ? t('invite.copied') : t('invite.copy')}
        </Button>
        {copyState === 'failed' ? (
          <FormAlert>{t('invite.copyFailed')}</FormAlert>
        ) : null}

        {canManage(workspace.role) ? (
          <ConfirmAction
            label={t('invite.regenerate')}
            prompt={t('invite.regeneratePrompt')}
            confirmLabel={t('invite.regenerateConfirm')}
            disabled={regenerate.isPending}
            onConfirm={() => regenerate.mutate(workspace.id)}
          />
        ) : null}
        {regenerate.isError ? (
          <FormAlert>
            {t(`errors.${workspaceErrorKey(regenerate.error)}`)}
          </FormAlert>
        ) : null}
      </div>
    </Section>
  );
}