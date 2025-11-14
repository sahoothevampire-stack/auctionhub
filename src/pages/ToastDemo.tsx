"use client";

import React from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

export default function ToastDemo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="space-y-3 max-w-md w-full">
        <h1 className="text-2xl font-bold">Toast demo (Sonner)</h1>
        <p className="text-sm text-muted-foreground">Click buttons to trigger Sonner toasts.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={() => toast("Simple info toast")}>Simple</Button>
          <Button onClick={() => toast.success("Success — action completed")}>Success</Button>
          <Button onClick={() => toast.error("Error — something went wrong")}>Error</Button>
          <Button
            onClick={() =>
              toast("Actionable toast: click to close")
            }
            variant="action"
          >
            Action
          </Button>
        </div>
      </div>
    </div>
  );
}
