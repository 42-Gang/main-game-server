import { BadRequestException, UnAuthorizedException } from '../../common/exceptions/core.error.js';
import { Socket } from 'socket.io';
import { verifyAccessToken } from './auth.js';

type NextFunction = (err?: Error) => void;

export async function socketMiddleware(socket: Socket, next: NextFunction) {
  try {
    const token = socket.handshake.query.token;
    if (!token || token === '' || Array.isArray(token)) {
      throw new BadRequestException('유효하지 않은 토큰 형식입니다.');
    }

    const { status, userId } = await verifyAccessToken(token);
    if (status !== 200) throw new UnAuthorizedException('인증되지 않은 사용자입니다.');

    socket.data.userId = parseInt(userId);
    next();
  } catch (e) {
    const logger = socket.nsp.server.logger;
    logger.error(e, 'Socket middleware error');
    next(e as Error);
  }
}
