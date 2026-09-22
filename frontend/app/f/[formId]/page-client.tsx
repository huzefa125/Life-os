"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { PublicFormSchema } from "@/lib/types";
import { PublicFormView } from "@/components/forms/public-form-view";

export default function PublicFormClient() {
  const params = useParams();
  const formId = typeof params.formId === "string" ? params.formId : "";
  const [schema, setSchema] = useState<PublicFormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;

    api.publicForms
      .getSchema(formId)
      .then((data) => {
        if (!cancelled) setSchema(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setRequiresLogin(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <LogIn className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">This form requires you to be logged into LifeOS.</p>
        <Link href={`/login?next=/f/${formId}`} className="text-sm font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  if (notFound || !schema) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">This form isn&apos;t available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicFormView schema={schema} />
    </div>
  );
}
