import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CreateUserInput, UpdateUserInput, LoginInput, UserResponse } from '../types/user.types';

const prisma = new PrismaClient();

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UserService {
  static async createUser(data: CreateUserInput): Promise<UserResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
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
      },
    });

    return this.toUserResponse(user);
  }

  static async signup(data: CreateUserInput): Promise<{ user: UserResponse; token: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
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
      },
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toUserResponse(user) : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    }) as Promise<User | null>;
  }

  static async updateUser(id: string, data: UpdateUserInput): Promise<UserResponse> {
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    const updateData: Record<string, string | null> = {};
    if (data.firstName !== undefined) updateData['firstName'] = data.firstName;
    if (data.lastName !== undefined) updateData['lastName'] = data.lastName;
    if (data.email !== undefined) updateData['email'] = data.email;
    if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl || null;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.toUserResponse(user);
  }

  static async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  static async login(data: LoginInput): Promise<{ user: UserResponse; token: string }> {
    const user = await this.getUserByEmail(data.email);

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  static async refreshToken(userId: string): Promise<{ user: UserResponse; token: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  private static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      process.env['JWT_SECRET'] || 'fallback-secret',
      { expiresIn: '7d' }
    );
  }

  private static toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
} 