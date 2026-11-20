'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
  COMMENT_MAX_LENGTH,
  createCommentSchema,
  updateCommentSchema,
} from '@kompak/shared';
import type { Comment, WorkspaceRole } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { TextArea } from '@/components/ui/text-area';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from './comment-hooks';
import { canDeleteComment, canEditComment } from './comment-permissions';
import { isEdited } from './comments-cache';
import { formatRelativeTime } from './relative-time';

interface Viewer {
  userId: string;
  role: WorkspaceRole;
}

export function CommentsSection({
  cardId,
  viewer,
}: {
  cardId: string;
  viewer: Viewer;
}) {
  const t = useTranslations('board.comments');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const headingId = useId();
  const comments = useComments(cardId);

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="font-semibold">
        {t('title')}
        {comments.data && comments.data.length > 0
          ? ` (${comments.data.length})`
          : ''}
      </h3>

      {comments.isPending ? (
        <p role="status" className="text-sm text-stone-600">
          {tCommon('loading')}
        </p>
      ) : comments.isError ? (
        <FormAlert>{tErrors(workspaceErrorKey(comments.error))}</FormAlert>
      ) : comments.data.length === 0 ? (
        <p className="text-sm text-stone-600">{t('empty')}</p>
      ) : (
        <ul className="space-y-3">
          {comments.data.map((comment) => (
            <CommentRow
              key={comment.id}
              cardId={cardId}
              comment={comment}
              viewer={viewer}
            />
          ))}
        </ul>
      )}

      <CommentForm cardId={cardId} />
    </section>
  );
}

interface CommentRowProps {
  cardId: string;
  comment: Comment;
  viewer: Viewer;
}

function CommentRow({ cardId, comment, viewer }: CommentRowProps) {
  const t = useTranslations('board.comments');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const update = useUpdateComment(cardId);
  const remove = useDeleteComment(cardId);
  const [editing, setEditing] = useState(false);
  const [bodyError, setBodyError] = useState<string | undefined>();

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateCommentSchema.safeParse({
      body: new FormData(event.currentTarget).get('body'),
    });
    if (!parsed.success) {
      setBodyError(t('required'));
      return;
    }

    setBodyError(undefined);
    update.mutate(
      { commentId: comment.id, input: parsed.data },
      { onSuccess: () => setEditing(false) },
    );
  }

  const mayEdit = canEditComment(viewer, comment);
  const mayDelete = canDeleteComment(viewer, comment);
  const error = update.isError
    ? update.error
    : remove.isError
      ? remove.error
      : null;

  return (
    <li className="space-y-2 rounded-xl bg-stone-50 p-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold">{comment.authorName}</span>
        <time dateTime={comment.createdAt} className="text-xs text-stone-500">
          {formatRelativeTime(comment.createdAt)}
        </time>
        {isEdited(comment) ? (
          <span className="text-xs text-stone-500">{t('edited')}</span>
        ) : null}
      </p>

      {editing ? (
        <form onSubmit={handleSave} noValidate className="space-y-2">
          <TextArea
            name="body"
            label={t('editLabel')}
            defaultValue={comment.body}
            maxLength={COMMENT_MAX_LENGTH}
            error={bodyError}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              {tCommon('save')}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <p className="wrap-anywhere whitespace-pre-wrap text-sm">
          {comment.body}
        </p>
      )}

      {!editing && (mayEdit || mayDelete) ? (
        <div className="flex flex-wrap gap-2">
          {mayEdit ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('edit')}
            </Button>
          ) : null}
          {mayDelete ? (
            <ConfirmAction
              label={t('delete')}
              prompt={t('deletePrompt')}
              confirmLabel={t('deleteConfirm')}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(comment.id)}
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <FormAlert>{tErrors(workspaceErrorKey(error))}</FormAlert>
      ) : null}
    </li>
  );
}

function CommentForm({ cardId }: { cardId: string }) {
  const t = useTranslations('board.comments');
  const tErrors = useTranslations('groups.errors');
  const create = useCreateComment(cardId);
  const [bodyError, setBodyError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = createCommentSchema.safeParse({
      body: new FormData(form).get('body'),
    });
    if (!parsed.success) {
      setBodyError(t('required'));
      return;
    }

    setBodyError(undefined);
    create.mutate(parsed.data, { onSuccess: () => form.reset() });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      <TextArea
        name="body"
        label={t('label')}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        error={bodyError}
      />
      {create.isError ? (
        <FormAlert>{tErrors(workspaceErrorKey(create.error))}</FormAlert>
      ) : null}
      <Button type="submit" fullWidth disabled={create.isPending}>
        {create.isPending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
