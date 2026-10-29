import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MarcaLockup } from "@/components/Marca";
import GuiaInstalacion from "@/components/GuiaInstalacion";

/** Página pública con las instrucciones para instalar la app (se comparte por WhatsApp). */
export default function Instalar() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center"><MarcaLockup /></div>
        <GuiaInstalacion />
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
