'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { LinkButton } from '@/components/ui/link-button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AuthCard } from '@/features/auth/auth-card';
import { useSession } from '@/features/auth/hooks';
import { clearNextPath, setNextPath } from '@/features/auth/next-path';
import { workspaceErrorKey } from './errors';
import { useInvitePreview, useJoinWorkspace } from './hooks';

export function JoinScreen({ code }: { code: string }) {
  const t = useTranslations('join');
  const tGroups = useTranslations('groups');
  const router = useRouter();
  const session = useSession();
  const preview = useInvitePreview(code);
  const join = useJoinWorkspace();

  const isLoggedIn = Boolean(session.data);

  // Tujuan "kembali ke sini" sudah terpenuhi begitu pengguna tiba dalam keadaan masuk.
  useEffect(() => {
    if (isLoggedIn) {
      clearNextPath();
    }
  }, [isLoggedIn]);

  if (preview.isPending || session.isPending) {
    return <LoadingScreen />;
  }

  if (preview.isError) {
    return (
      <AuthCard title={t('invalid.title')} subtitle={t('invalid.subtitle')}>
        <LinkButton href="/" fullWidth>
          {t('invalid.home')}
        </LinkButton>
      </AuthCard>
    );
  }

  const { workspaceName, memberCount } = preview.data;
  const returnPath = `/join/${encodeURIComponent(code)}`;

  return (
    <AuthCard
      title={t('title', { name: workspaceName })}
      subtitle={t('subtitle', { count: memberCount })}
    >
      {isLoggedIn ? (
        <div className="space-y-4">
          {join.isError ? (
            <FormAlert>
              {tGroups(`errors.${workspaceErrorKey(join.error)}`)}
            </FormAlert>
          ) : null}
          <Button
            fullWidth
            disabled={join.isPending}
            onClick={() =>
              join.mutate(code, {
                onSuccess: (result) =>
                  router.replace(`/groups/${result.workspaceId}`),
              })
            }
          >
            {join.isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">{t('guestHint')}</p>
          <LinkButton
            href="/login"
            fullWidth
            onClick={() => setNextPath(returnPath)}
          >
            {t('login')}
          </LinkButton>
          <LinkButton
            href="/register"
            variant="secondary"
            fullWidth
            onClick={() => setNextPath(returnPath)}
          >
            {t('register')}
          </LinkButton>
        </div>
      )}
    </AuthCard>
  );
}