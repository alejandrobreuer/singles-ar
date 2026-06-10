import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5491127135655";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center size-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
    >
      <MessageCircle size={26} fill="currentColor" className="text-white" />
    </a>
  );
}
