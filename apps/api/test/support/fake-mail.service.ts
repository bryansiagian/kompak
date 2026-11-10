export interface SentMail {
  kind: 'registration' | 'reset' | 'already-registered';
  to: string;
  code?: string;
}

export class FakeMailService {
  readonly sent: SentMail[] = [];

  sendRegistrationCode(to: string, code: string): Promise<void> {
    this.sent.push({ kind: 'registration', to, code });
    return Promise.resolve();
  }

  sendPasswordResetCode(to: string, code: string): Promise<void> {
    this.sent.push({ kind: 'reset', to, code });
    return Promise.resolve();
  }

  sendAlreadyRegisteredNotice(to: string): Promise<void> {
    this.sent.push({ kind: 'already-registered', to });
    return Promise.resolve();
  }

  mailsTo(to: string, kind: SentMail['kind']): SentMail[] {
    return this.sent.filter((mail) => mail.to === to && mail.kind === kind);
  }

  lastCode(to: string, kind: 'registration' | 'reset'): string {
    const mail = this.mailsTo(to, kind).at(-1);
    if (!mail?.code) {
      throw new Error(`No ${kind} code was sent to ${to}`);
    }
    return mail.code;
  }
}