export interface MailMessage {
  subject: string;
  text: string;
  html: string;
}

function wrapHtml(body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1c1917">
  <p style="font-size:20px;font-weight:700;color:#047857;margin:0 0 16px">Kompak</p>
  ${body}
</div>`;
}

function codeEmail(
  subject: string,
  intro: string,
  code: string,
  validMinutes: number,
  outro: string,
): MailMessage {
  const validity = `Kode berlaku ${validMinutes} menit. Jangan bagikan kode ini ke siapa pun.`;
  return {
    subject,
    text: ['Halo!', '', intro, '', code, '', validity, '', outro].join('\n'),
    html: wrapHtml(`<p>Halo!</p>
  <p>${intro}</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
  <p style="color:#57534e">${validity}</p>
  <p style="color:#57534e">${outro}</p>`),
  };
}

export function renderRegistrationCodeEmail(
  code: string,
  validMinutes: number,
): MailMessage {
  return codeEmail(
    'Kode pendaftaran Kompak',
    'Ini kode untuk membuat akun Kompak kamu:',
    code,
    validMinutes,
    'Kalau kamu tidak merasa mendaftar di Kompak, abaikan saja email ini.',
  );
}

export function renderPasswordResetCodeEmail(
  code: string,
  validMinutes: number,
): MailMessage {
  return codeEmail(
    'Kode reset kata sandi Kompak',
    'Ini kode untuk mengatur ulang kata sandi akun Kompak kamu:',
    code,
    validMinutes,
    'Kalau kamu tidak meminta reset kata sandi, abaikan saja email ini. Kata sandimu tetap aman.',
  );
}

export function renderAlreadyRegisteredEmail(): MailMessage {
  const text =
    'Ada yang mencoba mendaftar di Kompak dengan email ini, tapi akunnya sudah ada. ' +
    'Kalau itu kamu, silakan masuk. Kalau lupa kata sandi, pakai "Lupa kata sandi?" di halaman masuk. ' +
    'Kalau bukan kamu, abaikan saja email ini.';
  return {
    subject: 'Email ini sudah terdaftar di Kompak',
    text: `Halo!\n\n${text}`,
    html: wrapHtml(`<p>Halo!</p>\n  <p>${text}</p>`),
  };
}