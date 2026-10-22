import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Rate limit global por IP; passou do limite, 429 com código estável (`Retry-After` já vai no header). */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente de novo em instantes.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
