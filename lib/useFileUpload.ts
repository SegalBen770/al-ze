"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/** מעלה קבצים ל-Convex storage ומחזיר את ה-storageIds. */
export function useUploadImages() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  return async (files: File[]): Promise<Id<"_storage">[]> => {
    const ids: Id<"_storage">[] = [];
    for (const file of files) {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("העלאת הקובץ נכשלה");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      ids.push(storageId);
    }
    return ids;
  };
}
