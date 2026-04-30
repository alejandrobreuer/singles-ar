"use client";

import * as React from "react";
import { toast } from "sonner";

export function PaymentSuccessToast() {
  React.useEffect(() => {
    toast.success("¡Pago confirmado! Tu compra fue procesada correctamente.");
  }, []);
  return null;
}
