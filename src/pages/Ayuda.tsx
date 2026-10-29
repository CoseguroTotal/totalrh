import { Navigate, useSearchParams } from "react-router-dom";
import { LifeBuoy, Loader2 } from "lucide-react";
import ConversacionSoporte from "@/components/ConversacionSoporte";
import { useSesionSoporte } from "@/hooks/useSoporte";

/** Ayuda: cada usuario le escribe al soporte de TotalRH (aparte del chat interno de la empresa). */
export default function Ayuda() {
  const [params] = useSearchParams();
  const { userId, esSoporte } = useSesionSoporte();

  if (esSoporte) return <Navigate to="/soporte" replace />;
  if (!userId) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border bg-muted/30 shadow-sm sm:h-[calc(100dvh-9rem)]">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><LifeBuoy className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h1 className="font-semibold">Ayuda y soporte</h1>
          <p className="text-xs text-muted-foreground">Escribinos tu consulta. Te respondemos acá y te avisamos en la campanita.</p>
        </div>
      </div>
      <ConversacionSoporte
        usuarioId={userId}
        yo={userId}
        pantalla={params.get("desde") ?? undefined}
        vacio={
          <div className="mx-auto mt-6 max-w-sm space-y-2 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">¿En qué te podemos ayudar?</p>
            <p>Por ejemplo: no puedo fichar, no veo mi recibo, quiero cambiar algo de la app. Si podés, contanos qué estabas haciendo.</p>
          </div>
        }
      />
    </div>
  );
}
