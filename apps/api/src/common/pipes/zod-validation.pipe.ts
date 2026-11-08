import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

export class ZodValidationPipe<S extends ZodTypeAny>
  implements PipeTransform<unknown, z.infer<S>>
{
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
