import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== "yashgupta.yg318@gmail.com") {
    redirect("/");
  }

  return (
    <div className={inter.className}>
      {children}
    </div>
  );
}