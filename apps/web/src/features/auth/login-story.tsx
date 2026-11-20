import { useTranslations } from 'next-intl';
import { Brand } from '@/components/ui/app-shell';
import './login.css';

export function LoginStory({ compact }: { compact: boolean }) {
  const t = useTranslations('auth.story');
  return (
    <aside
      className={compact ? 'login-story login-story-compact' : 'login-story'}
    >
      <Brand />
      <svg
        className="pieces"
        viewBox="0 0 360 212"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="#e8e8e8" opacity=".22">
          <path d="M1 188h358M44 11v190M316 11v190" />
          <circle cx="180" cy="113" r="88" strokeDasharray="2 6" />
        </g>
        <g className="piece-west" fill="#abbc97">
          <path d="M45 186V99a72 72 0 0 1 72-72h56v44h-54a30 30 0 0 0-30 30v85Z" />
          <path d="M98 186v-76a30 30 0 0 1 30-30h45v43h-23a10 10 0 0 0-10 10v53Z" />
        </g>
        <g className="piece-east" fill="#e8e8e8">
          <path d="M181 27h43a92 92 0 0 1 92 92v67h-44v-66a49 49 0 0 0-49-49h-42Z" />
          <path d="M181 80h38a44 44 0 0 1 44 44v62h-43v-49a14 14 0 0 0-14-14h-25Z" />
        </g>
        <path
          className="piece-key"
          fill="#d49837"
          d="M149 186v-24a31 31 0 0 1 62 0v24Z"
        />
      </svg>
      <div className="login-story-copy">
        <h2>{t('heading')}</h2>
        <p>{t('body')}</p>
      </div>
    </aside>
  );
}
