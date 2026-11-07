import type { Metadata } from "next";
import { AdminConsole } from "@/components/AdminConsole";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Administration — Mawjoud",
  robots: { index: false, follow: false },
};

// Per-admin data: nothing is fetched or cached on the server.
export default function AdminPage() {
  return (
    <PageContainer width="wide">
      <AdminConsole />
    </PageContainer>
  );
}
