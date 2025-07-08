import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput, UserResponse } from '../types/user.types';
import { UserAlreadyExistsError, UserNotFoundError, VirtualUserLoginError } from '../errors/UserErrors';
import { InvalidCredentialsError } from '../errors/AuthErrors';
import { GoogleUser } from '../types/google-auth.types';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  password: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  isVirtual: boolean;
};

export class UserService {
  static async createUser(data: CreateUserInput): Promise<UserResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        avatarUrl: data.avatarUrl || null,
        isVirtual: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    return this.toUserResponse(user);
  }

  static async signup(data: CreateUserInput): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        avatarUrl: data.avatarUrl || null,
        isVirtual: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    const token = this.generateToken(user.id, user.email!);
    const refreshToken = this.generateRefreshToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
      refreshToken,
    };
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    return user ? this.toUserResponse(user) : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    }) as Promise<User | null>;
  }

  static async updateUser(id: string, data: UpdateUserInput): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.isVirtual) {
      throw new VirtualUserLoginError();
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    return this.toUserResponse(updatedUser);
  }

  static async changePassword(id: string, data: ChangePasswordInput): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.isVirtual) {
      throw new VirtualUserLoginError();
    }

    if (!user.password) {
      throw new InvalidCredentialsError();
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    return this.toUserResponse(updatedUser);
  }

  static async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  static async login(data: LoginInput): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const user = await this.getUserByEmail(data.email);

    if (!user || !user.password || !(await bcrypt.compare(data.password, user.password))) {
      throw new InvalidCredentialsError();
    }

    if (user.isVirtual) {
      throw new VirtualUserLoginError();
    }

    const token = this.generateToken(user.id, user.email!);
    const refreshToken = this.generateRefreshToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
      refreshToken,
    };
  }

  static async refreshToken(userId: string): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const token = this.generateToken(user.id, user.email!);
    const refreshToken = this.generateRefreshToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
      refreshToken,
    };
  }
  
  private static generateRefreshToken(userId: string, email: string): string {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return jwt.sign(
      { userId, email, type: 'refresh' },
      jwtSecret,
      { expiresIn: '30d' } // Refresh tokens last 30 days
    );
  }

  private static generateToken(userId: string, email: string): string {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return jwt.sign(
      { userId, email },
      jwtSecret,
      { expiresIn: '1h' } // Reduced from 7 days to 1 hour
    );
  }

  private static toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isVirtual: user.isVirtual,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async loginWithGoogle(googleUser: GoogleUser): Promise<{ user: UserResponse; token: string; refreshToken: string; isNewUser: boolean }> {
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        isVirtual: true,
      },
    });

    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: googleUser.given_name,
          lastName: googleUser.family_name,
          email: googleUser.email,
          avatarUrl: googleUser.picture || null,
          password: null,
          isVirtual: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          isVirtual: true,
        },
      });
      isNewUser = true;
    }

    if (user.isVirtual) {
      throw new VirtualUserLoginError();
    }

    const token = this.generateToken(user.id, user.email!);
    const refreshToken = this.generateRefreshToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
      refreshToken,
      isNewUser,
    };
  }
} 