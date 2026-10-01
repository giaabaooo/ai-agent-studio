import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/security/crypto";
import { createSession, getSession, clearSession } from "@/lib/security/session";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Tài khoản hoặc mật khẩu không chính xác");
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async getCurrentUser() {
    const session = await getSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return user;
  }

  async logout() {
    await clearSession();
  }
}

export const authService = new AuthService();
