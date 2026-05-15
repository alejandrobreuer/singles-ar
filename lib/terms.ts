export interface TermItem {
  id:        string;
  text:      string;
  linkText?: string;
  linkHref?: string;
  highlight?: boolean;
}

export const TERMS: TermItem[] = [
  {
    id:        "main",
    highlight: true,
    text:      "Leí y acepto los ",
    linkText:  "Términos y Condiciones de Singles.ar",
    linkHref:  "/terms",
  },
  {
    id:   "intermediary",
    text: "Entiendo que Singles.ar es una plataforma intermediaria. Las transacciones ocurren entre usuarios particulares — Singles.ar no verifica la autenticidad de las cartas ni garantiza el resultado de ninguna transacción.",
  },
  {
    id:   "contact",
    text: "Me comprometo a no compartir datos de contacto personal con otros usuarios para eludir el sistema de pago de la plataforma. Entiendo que hacerlo puede resultar en la suspensión permanente de mi cuenta.",
  },
  {
    id:   "payment",
    text: "Entiendo que el pago se procesa en el momento de la compra. Una vez que el vendedor confirma la entrega, tengo 72 horas para reportar cualquier problema a través de la plataforma.",
  },
];
