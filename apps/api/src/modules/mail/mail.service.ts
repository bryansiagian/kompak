import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  renderAlreadyRegisteredEmail,
  renderPasswordResetCodeEmail,
  renderRegistrationCodeEmail,
} from './mail.templates';
import type { MailMessage } from './mail.templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const smtpUrl = config.get<string>('SMTP_URL');
    this.from =
      config.get<string>('MAIL_FROM') ?? 'Kompak <no-reply@kompak.local>';

    if (smtpUrl) {
      this.transporter = createTransport(smtpUrl);
    } else if (config.get<string>('NODE_ENV') === 'production') {
      throw new Error('SMTP_URL wajib diatur di production');
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP_URL belum diatur: email hanya dicatat di log (khusus pengembangan)',
      );
    }
  }

  sendRegistrationCode(
    to: string,
    code: string,
    validMinutes: number,
  ): Promise<void> {
    return this.send(to, renderRegistrationCodeEmail(code, validMinutes));
  }

  sendPasswordResetCode(
    to: string,
    code: string,
    validMinutes: number,
  ): Promise<void> {
    return this.send(to, renderPasswordResetCodeEmail(code, validMinutes));
  }

  sendAlreadyRegisteredNotice(to: string): Promise<void> {
    return this.send(to, renderAlreadyRegisteredEmail());
  }

  private async send(to: string, message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[DEV MAIL] to=${to} subject="${message.subject}"\n${message.text}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send email',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Unable to send email');
    }
  }
}