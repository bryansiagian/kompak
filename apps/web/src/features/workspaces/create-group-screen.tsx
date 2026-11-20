'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createWorkspaceSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { AppShell, PageHeader } from '@/components/ui/app-shell';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { RequireAuth } from '@/features/auth/require-auth';
import { workspaceErrorKey } from './errors';
import { useCreateWorkspace } from './hooks';

export function CreateGroupScreen() {
  const t = useTranslations('groups');
  const router = useRouter();
  const create = useCreateWorkspace();
  const [nameError, setNameError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createWorkspaceSchema.safeParse({
      name: new FormData(event.currentTarget).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('create.nameRequired'));
      return;
    }

    setNameError(undefined);
    create.mutate(parsed.data, {
      onSuccess: (workspace) => router.push(`/groups/${workspace.id}`),
    });
  }

  return (
    <RequireAuth>
      {() => (
        <AppShell>
          <TextLink href="/groups">{t('create.back')}</TextLink>
          <div className="mx-auto max-w-lg">
            <PageHeader
              title={t('create.title')}
              description={t('create.description')}
            />
            <div className="mt-5 rounded-2xl border border-divider bg-surface p-5 shadow-panel sm:p-7">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <TextField
                  name="name"
                  label={t('create.name')}
                  autoComplete="off"
                  error={nameError}
                />
                {create.isError ? (
                  <FormAlert>
                    {t(`errors.${workspaceErrorKey(create.error)}`)}
                  </FormAlert>
                ) : null}
                <Button type="submit" fullWidth disabled={create.isPending}>
                  {create.isPending
                    ? t('create.submitting')
                    : t('create.submit')}
                </Button>
              </form>
            </div>
          </div>
        </AppShell>
      )}
    </RequireAuth>
  );
}
