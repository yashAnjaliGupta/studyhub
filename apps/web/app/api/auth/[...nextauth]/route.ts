import { PrismaClient } from "@repo/db/client";
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
const client = new PrismaClient() as any;

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
                    }
                });
                if (user) {
                    const result = await bcrypt.compare(credentials.password, user.password);
                    if (result) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name
                        }
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
        })
    ],
    pages: {
        signIn: '/signin',
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
                    }
                });
                if (!userExists) {
                    await client.user.create({
                        data: {
                            email: user.email,
                            name: user.name || "",
                        }
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
                    }
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
        }
    },
    secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;