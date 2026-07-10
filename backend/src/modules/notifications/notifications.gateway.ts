import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../common/enums';

/**
 * Socket.io gateway. Each authenticated socket joins:
 *  - user:<userId>  (personal room)
 *  - role:<role>    (role broadcast room)
 *  - dept:<deptId>  (department room)
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('NotificationsGateway');

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access',
      });
      client.data.user = payload;
      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);
      if (payload.departmentId) client.join(`dept:${payload.departmentId}`);
      this.logger.log(`Connected ${payload.email} (${payload.role})`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Disconnected ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitToRole(role: string, event: string, data: unknown) {
    this.server?.to(`role:${role}`).emit(event, data);
  }

  emitToDepartment(departmentId: string, event: string, data: unknown) {
    this.server?.to(`dept:${departmentId}`).emit(event, data);
  }
}
