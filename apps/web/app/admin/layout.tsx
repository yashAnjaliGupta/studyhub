import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL || "yashgupta.yg318@gmail.com";

  if (!session || session.user?.email !== adminEmail) {
    redirect("/");
  }

  return (
    <div>
      {children}
    </div>
  );
}
