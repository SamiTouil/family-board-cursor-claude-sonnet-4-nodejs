import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JoinRequestData, FamilyUpdateData, WebSocketEventData } from '../types/websocket.types';
import { JWTPayload } from '../middleware/auth.middleware';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string | undefined;
}

interface SocketUser {
  id: string;
  email: string | null;
  socketId: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, SocketUser>(); // userId -> user info
  private userSockets = new Map<string, string>(); // socketId -> userId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userEmail} connected with socket ${socket.id}`);
      
      if (socket.userId) {
        // Store user connection
        this.connectedUsers.set(socket.userId, {
          id: socket.userId,
          email: socket.userEmail!,
          socketId: socket.id,
        });
        this.userSockets.set(socket.id, socket.userId);

        // Join user to their family rooms
        this.joinUserToFamilyRooms(socket);
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userEmail} disconnected`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.userSockets.delete(socket.id);
        }
      });

      // Handle joining family rooms (when user joins a new family)
      socket.on('join-family', (familyId: string) => {
        this.joinFamilyRoom(socket, familyId);
      });

      // Handle leaving family rooms (when user leaves a family)
      socket.on('leave-family', (familyId: string) => {
        this.leaveFamilyRoom(socket, familyId);
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth['token'];
      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      const jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not configured');
      }
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      if (user.email) {
        socket.userEmail = user.email;
      }
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  private async joinUserToFamilyRooms(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    try {
      // Get all families the user belongs to
      const userFamilies = await prisma.familyMember.findMany({
        where: { userId: socket.userId },
        include: { family: true },
      });

      // Join all family rooms
      for (const membership of userFamilies) {
        const roomName = `family:${membership.familyId}`;
        socket.join(roomName);
        console.log(`User ${socket.userEmail} joined room ${roomName}`);
      }
    } catch (error) {
      console.error('Error joining family rooms:', error);
    }
  }

  private async joinFamilyRoom(socket: AuthenticatedSocket, familyId: string) {
    if (!socket.userId) return;

    try {
      // Verify user is a member of this family
      const membership = await prisma.familyMember.findUnique({
        where: {
          userId_familyId: {
            userId: socket.userId,
            familyId,
          },
        },
      });

      if (membership) {
        const roomName = `family:${familyId}`;
        socket.join(roomName);
        console.log(`User ${socket.userEmail} joined room ${roomName}`);
      }
    } catch (error) {
      console.error('Error joining family room:', error);
    }
  }

  private leaveFamilyRoom(socket: AuthenticatedSocket, familyId: string) {
    const roomName = `family:${familyId}`;
    socket.leave(roomName);
    console.log(`User ${socket.userEmail} left room ${roomName}`);
  }

  // Public methods for sending events

  /**
   * Send event to a specific user
   */
  public sendToUser(userId: string, event: string, data: WebSocketEventData | Record<string, unknown>) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
      console.log(`Sent ${event} to user ${user.email}`);
    }
  }

  /**
   * Send event to all members of a family
   */
  public sendToFamily(familyId: string, event: string, data: WebSocketEventData | Record<string, unknown>) {
    const roomName = `family:${familyId}`;
    this.io.to(roomName).emit(event, data);
    console.log(`Sent ${event} to family room ${roomName}`);
  }

  /**
   * Send event to all family admins
   */
  public async sendToFamilyAdmins(familyId: string, event: string, data: WebSocketEventData | Record<string, unknown>) {
    try {
      const admins = await prisma.familyMember.findMany({
        where: {
          familyId,
          role: 'ADMIN',
        },
        select: { userId: true },
      });

      for (const admin of admins) {
        this.sendToUser(admin.userId, event, data);
      }
    } catch (error) {
      console.error('Error sending to family admins:', error);
    }
  }

  /**
   * Notify about join request events
   */
  public async notifyJoinRequestCreated(familyId: string, joinRequest: JoinRequestData) {
    await this.sendToFamilyAdmins(familyId, 'join-request-created', {
      type: 'join-request-created',
      familyId,
      joinRequest,
    });
  }

  public async notifyJoinRequestApproved(userId: string, familyId: string, familyName: string) {
    this.sendToUser(userId, 'join-request-approved', {
      type: 'join-request-approved',
      familyId,
      familyName,
      message: `Your request to join "${familyName}" has been approved!`,
    });

    // Also notify family members about new member
    this.sendToFamily(familyId, 'member-joined', {
      type: 'member-joined',
      familyId,
      userId,
    });
  }

  public async notifyJoinRequestRejected(userId: string, familyId: string, familyName: string) {
    this.sendToUser(userId, 'join-request-rejected', {
      type: 'join-request-rejected',
      familyId,
      familyName,
      message: `Your request to join "${familyName}" has been rejected.`,
    });
  }

  /**
   * Notify about family updates
   */
  public notifyFamilyUpdated(familyId: string, updateType: string, data: FamilyUpdateData | Record<string, unknown>) {
    this.sendToFamily(familyId, 'family-updated', {
      type: 'family-updated',
      updateType,
      familyId,
      data,
    });
  }

  /**
   * Notify about member role changes
   */
  public notifyMemberRoleChanged(familyId: string, userId: string, newRole: string) {
    this.sendToFamily(familyId, 'member-role-changed', {
      type: 'member-role-changed',
      familyId,
      userId,
      newRole,
    });
  }

  /**
   * Notify about task reassignments
   */
  public notifyTaskReassigned(familyId: string, taskReassignmentData: {
    taskId: string;
    taskName: string;
    date: string;
    originalMemberId: string | null;
    newMemberId: string | null;
    originalMemberName?: string;
    newMemberName?: string;
    adminUserId: string;
    adminName: string;
  }) {
    // Notify the user who lost the task (if any)
    if (taskReassignmentData.originalMemberId) {
      this.sendToUser(taskReassignmentData.originalMemberId, 'task-unassigned', {
        type: 'task-unassigned',
        familyId,
        taskId: taskReassignmentData.taskId,
        taskName: taskReassignmentData.taskName,
        date: taskReassignmentData.date,
        adminName: taskReassignmentData.adminName,
        message: `"${taskReassignmentData.taskName}" on ${taskReassignmentData.date} has been unassigned from you by ${taskReassignmentData.adminName}`,
      });
    }

    // Notify the user who got the task (if any)
    if (taskReassignmentData.newMemberId) {
      this.sendToUser(taskReassignmentData.newMemberId, 'task-assigned', {
        type: 'task-assigned',
        familyId,
        taskId: taskReassignmentData.taskId,
        taskName: taskReassignmentData.taskName,
        date: taskReassignmentData.date,
        adminName: taskReassignmentData.adminName,
        message: `"${taskReassignmentData.taskName}" on ${taskReassignmentData.date} has been assigned to you by ${taskReassignmentData.adminName}`,
      });
    }

    // Notify all family members about the general task change (for shift indicator updates)
    this.sendToFamily(familyId, 'task-schedule-updated', {
      type: 'task-schedule-updated',
      familyId,
      taskId: taskReassignmentData.taskId,
      taskName: taskReassignmentData.taskName,
      date: taskReassignmentData.date,
      originalMemberId: taskReassignmentData.originalMemberId,
      newMemberId: taskReassignmentData.newMemberId,
      adminName: taskReassignmentData.adminName,
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
    console.log('WebSocket service initialized');
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService;
}; 