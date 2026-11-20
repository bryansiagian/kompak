import Link from 'next/link';
import messages from '@/messages/id.json';
import './landing.css';

const t = messages.landing;
const links = [
  [t.features, '#fitur'],
  [t.show, '#papan'],
  [t.how, '#cara-kerja'],
] as const;

function StartLink() {
  return (
    <Link className="start-link" href="/login">
      {t.start}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
function Wordmark() {
  return (
    <a href="#awal" className="landing-logo">
      <span aria-hidden="true">K</span>
      {messages.common.appName}
    </a>
  );
}
function ProjectBoard() {
  return (
    <figure className="orbit">
      <figcaption className="orbit-caption">
        <span aria-hidden="true">✳</span> {t.sample}
      </figcaption>
      <svg
        aria-hidden="true"
        className="orbit-lines"
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        fill="none"
      >
        <ellipse
          cx="315"
          cy="205"
          rx="267"
          ry="154"
          transform="rotate(-14 315 205)"
        />
        <path
          pathLength="1"
          d="M415 36 V65 Q415 78 402 78 H335 V135 M308 245 V310 Q308 326 290 326 H242 V367"
        />
      </svg>
      <div className="orbit-note orbit-owner">
        <i aria-hidden="true">{t.people[1][0]}</i>
        <div>
          <small>{t.assignee}</small>
          <b>
            {t.people[1]} · {t.tasks[1]}
          </b>
        </div>
      </div>
      <div className="orbit-board">
        <div className="orbit-bar">
          <span className="orbit-mark" aria-hidden="true">
            K
          </span>
          {t.team}
          <span aria-hidden="true" className="orbit-avatars">
            {t.people.map((name) => (
              <i key={name}>{name[0]}</i>
            ))}
          </span>
        </div>
        <strong className="orbit-title">{t.project}</strong>
        <div className="orbit-lanes">
          {t.lanes.map((lane, i) => (
            <div className="orbit-lane" key={lane}>
              <b>{lane}</b>
              <div className="orbit-task">
                <strong>{t.tasks[i]}</strong>
                <small>{t.people[i]}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="orbit-note orbit-comment">
        <small>
          {t.discussion} · {t.tasks[1]}
        </small>
        <p>{t.comment}</p>
      </div>
    </figure>
  );
}
export default function HomePage() {
  const sectionLinks = links.map(([label, href]) => (
    <a key={href} href={href}>
      {label}
    </a>
  ));
  return (
    <div className="landing" id="awal">
      <a className="skip-landing" href="#utama">
        {t.skip}
      </a>
      <header className="landing-nav">
        <Wordmark />
        <nav aria-label={t.nav}>{sectionLinks}</nav>
        <div className="nav-actions">
          <Link href="/login">{t.login}</Link>
          <StartLink />
        </div>
        <details className="mobile-menu">
          <summary>{t.menu}</summary>
          <nav aria-label={t.nav}>
            {sectionLinks}
            <Link href="/login">{t.login}</Link>
          </nav>
        </details>
      </header>
      <main id="utama">
        <section className="cover">
          <div className="cover-inner">
            <div className="cover-copy">
              <h1>
                {t.hero[0]}
                <br />
                <em>{t.hero[1]}</em>
              </h1>
              <p>{t.intro}</p>
              <div className="cover-actions">
                <StartLink />
                <a href="#cara-kerja">{t.walk} ↓</a>
              </div>
            </div>
            <div className="constellation">
              <ProjectBoard />
            </div>
          </div>
        </section>
        <section className="spread problem">
          <h2>{t.problem}</h2>
          <ul>
            {t.issues.map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="solution" id="fitur">
          <div className="spread">
            <h2>{t.solution}</h2>
            <div className="benefit-grid">
              {t.benefits.map(([title, body]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="papan" className="spread showcase">
          <div>
            <h2>{t.experience}</h2>
            <p>{t.experienceBody}</p>
          </div>
          <figure className="detail-print">
            <figcaption>{t.detail}</figcaption>
            <h3>{t.tasks[1]}</h3>
            <dl>
              <dt>{t.assignee}</dt>
              <dd>{t.people[1]}</dd>
            </dl>
            <strong>{t.discussion}</strong>
            <blockquote>{t.comment}</blockquote>
          </figure>
        </section>
        <section id="cara-kerja" className="spread steps">
          <h2>{t.how}</h2>
          <ol>
            {t.steps.map(([title, body], i) => (
              <li key={title}>
                <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="closing">
          <div className="spread">
            <h2>{t.closing}</h2>
            <div>
              <p>{t.closingBody}</p>
              <StartLink />
            </div>
          </div>
        </section>
      </main>
      <footer className="spread landing-footer">
        <div>
          <Wordmark />
          <p>{t.footer}</p>
        </div>
        <nav aria-label={t.nav}>{sectionLinks}</nav>
        <blockquote>{t.quote}</blockquote>
        <small>
          © {t.copyright} ·{' '}
          <a href="https://github.com/bryansiagian">{t.credit}</a>
        </small>
      </footer>
    </div>
  );
}
