import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_CONFIG } from '../config/jwt.config';
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput, UserResponse } from '../types/user.types';

const prisma = new PrismaClient();

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
      throw new Error('Email already exists');
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

  static async signup(data: CreateUserInput): Promise<{ user: UserResponse; token: string }> {
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
      throw new Error('Email already exists');
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

    return {
      user: this.toUserResponse(user),
      token,
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
      throw new Error('User not found');
    }

    if (user.isVirtual) {
      throw new Error('Cannot update virtual user profile');
    }

    const updateData: any = {};
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
      throw new Error('User not found');
    }

    if (user.isVirtual) {
      throw new Error('Virtual users cannot change passwords');
    }

    if (!user.password) {
      throw new Error('User has no password set');
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
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

  static async login(data: LoginInput): Promise<{ user: UserResponse; token: string }> {
    const user = await this.getUserByEmail(data.email);

    if (!user || !user.password || !(await bcrypt.compare(data.password, user.password))) {
      throw new Error('Invalid credentials');
    }

    if (user.isVirtual) {
      throw new Error('Cannot login as virtual user');
    }

    const token = this.generateToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  static async refreshToken(userId: string): Promise<{ user: UserResponse; token: string }> {
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
      throw new Error('User not found');
    }

    const token = this.generateToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  private static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      getJwtSecret(),
      { expiresIn: JWT_CONFIG.EXPIRES_IN, algorithm: JWT_CONFIG.ALGORITHM }
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

  static async loginWithGoogle(googleUser: any): Promise<{ user: UserResponse; token: string; isNewUser: boolean }> {
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
      throw new Error('Cannot login as virtual user');
    }

    const token = this.generateToken(user.id, user.email!);

    return {
      user: this.toUserResponse(user),
      token,
      isNewUser,
    };
  }
} 