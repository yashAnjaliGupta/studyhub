import { client as dbClient } from "@repo/db/client";
import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";

const client = dbClient as any;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("credentials_____________", credentials);
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await client.user.findFirst({
          where: {
            email: credentials.email,
          },
        });
        if (user) {
          const result = await bcrypt.compare(credentials.password, user.password);
          if (result) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          return false;
        }
        const userExists = await client.user.findFirst({
          where: {
            email: user.email,
          },
        });
        if (!userExists) {
          await client.user.create({
            data: {
              email: user.email,
              name: user.name || "",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await client.user.findFirst({
          where: {
            email: user.email || "",
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      try {
        const urlObj = new URL(url);
        // Allow cross-app SSO redirects between localhost and yashguptaiiit.in subdomains
        if (
          urlObj.hostname === "localhost" ||
          urlObj.hostname === "127.0.0.1" ||
          urlObj.hostname === "yashguptaiiit.in" ||
          urlObj.hostname.endsWith(".yashguptaiiit.in")
        ) {
          return url;
        }
        if (urlObj.origin === baseUrl) return url;
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
        secure: process.env.NODE_ENV === "production" && Boolean(process.env.NEXTAUTH_URL?.startsWith("https://")),
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "mySecret",
};

export const authHandler = NextAuth(authOptions);

// Exam-specific roles and permissions
export enum ExamRole {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}

export interface ExamUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: ExamRole;
  examPreferences: {
    defaultShuffleQuestions: boolean;
    defaultShuffleOptions: boolean;
    defaultDurationMinutes: number;
    preferredSubjects: string[];
  };
}

// Helper to get session with authOptions
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

// Helper to get exam user session
export async function getExamSession(): Promise<ExamUser | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return {
    id: (session.user as any)?.id || "",
    name: session.user?.name || null,
    email: session.user?.email || null,
    image: session.user?.image || null,
    role: ExamRole.STUDENT,
    examPreferences: {
      defaultShuffleQuestions: true,
      defaultShuffleOptions: true,
      defaultDurationMinutes: 180,
      preferredSubjects: [],
    },
  };
}

// Helper to check if user has exam access
export function hasExamAccess(user: ExamUser | null, requiredRole: ExamRole): boolean {
  if (!user) return false;

  const roleHierarchy: ExamRole[] = [ExamRole.STUDENT, ExamRole.TEACHER, ExamRole.ADMIN];
  const userLevel = roleHierarchy.indexOf(user.role);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);

  return userLevel >= requiredLevel;
}

// Helper to check if user is authenticated for exam access
export function isExamAuthenticated(user: ExamUser | null): boolean {
  return user !== null && user.role === ExamRole.STUDENT;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export * from "./otp";

export { getServerSession, NextAuth, bcrypt };