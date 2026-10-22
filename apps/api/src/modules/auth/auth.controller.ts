import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { anonymousAuthSchema } from '@ta-em-dia/shared';
import { Public } from '../../common/auth/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('anonymous')
  @HttpCode(200)
  anonymous(@Body() body: unknown) {
    const parsed = anonymousAuthSchema.safeParse(body);
    if (!parsed.success) {
      // Só os campos com erro; o corpo (segredo do aparelho) nunca volta na resposta nem vai para log.
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Pedido inválido',
        fields: parsed.error.issues.map((issue) => issue.path.join('.')),
      });
    }
    return this.auth.anonymous(parsed.data);
  }
}
