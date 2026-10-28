import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const client = globalThis.prismaGlobal ?? prismaClientSingleton();
export const prisma = client;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = client;
}

export { PrismaClient };
export * from "@prisma/client";
export default client;
