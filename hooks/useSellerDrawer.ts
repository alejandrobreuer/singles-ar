import { create } from "zustand";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface SellerDrawerState {
  isOpen:   boolean;
  sellerId: string | null;
  open:     (sellerId: string) => void;
  close:    () => void;
}

export const useSellerDrawer = create<SellerDrawerState>((set) => ({
  isOpen:   false,
  sellerId: null,
  open:  (sellerId) => set({ isOpen: true, sellerId }),
  close: ()          => set({ isOpen: false }),
}));

/**
 * Auth-gated trigger: opens the seller drawer if the visitor is logged in,
 * otherwise prompts them to log in. Use this from any clickable display name.
 */
export function useOpenSellerDrawer() {
  const router = useRouter();
  const open   = useSellerDrawer((s) => s.open);

  return async (sellerId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Iniciá sesión para ver más listings de este vendedor");
      router.push("/login");
      return;
    }
    open(sellerId);
  };
}
