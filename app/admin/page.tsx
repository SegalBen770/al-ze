"use client";

import { useQuery } from "convex/react";
import { Building2, SlidersHorizontal } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { CustomersManager } from "@/components/admin/CustomersManager";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminContent />
    </AppShell>
  );
}

function AdminContent() {
  const me = useQuery(api.users.current);

  if (me === undefined) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="text-muted-foreground">אזור זה מיועד למנהלי המערכת בלבד.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ניהול המערכת</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          לקוחות, משתמשים, והגדרות הטיקטים — הכול במקום אחד.
        </p>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">
            <Building2 className="size-4" />
            לקוחות ומשתמשים
          </TabsTrigger>
          <TabsTrigger value="taxonomy">
            <SlidersHorizontal className="size-4" />
            הגדרות מערכת
          </TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <CustomersManager />
        </TabsContent>
        <TabsContent value="taxonomy">
          <TaxonomyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
