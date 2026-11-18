import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
});

const MAX_PROVIDER_RESPONSE = 32_000;

/**
 * A small server-only OpenAI-compatible Chat Completions adapter.
 * The API key never reaches the browser and provider errors are not exposed.
 */
@Injectable()
export class AiProvider {
  assertConfigured(): void {
    if (!process.env.AI_API_KEY || !process.env.AI_MODEL) {
      throw new ServiceUnavailableException({
        message: 'AI belum dikonfigurasi oleh pengelola aplikasi',
        code: 'AI_NOT_CONFIGURED',
      });
    }
  }

  async json(system: string, data: unknown): Promise<unknown> {
    this.assertConfigured();
    const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
    let url: URL;
    try {
      url = new URL(`${baseUrl.replace(/\/$/, '')}/chat/completions`);
    } catch {
      throw new ServiceUnavailableException('AI endpoint is not configured correctly');
    }
    if (url.protocol !== 'https:' &&
        !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
      throw new ServiceUnavailableException('AI endpoint must use HTTPS');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL,
          temperature: 0.2,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            // These are untrusted user-authored cards/comments, not instructions.
            { role: 'user', content: JSON.stringify(data) },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      const responseText = await response.text();
      if (responseText.length > MAX_PROVIDER_RESPONSE) throw new Error('Provider output too large');
      const parsed = completionSchema.parse(JSON.parse(responseText) as unknown);
      const content = parsed.choices[0].message.content;
      if (!content || content.length > MAX_PROVIDER_RESPONSE) throw new Error('Missing AI content');
      return JSON.parse(content) as unknown;
    } catch {
      throw new ServiceUnavailableException({
        message: 'Layanan AI sedang tidak tersedia. Coba lagi nanti.',
        code: 'AI_PROVIDER_UNAVAILABLE',
      });
    }
  }
}
