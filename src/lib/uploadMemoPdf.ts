import { supabase } from "@/integrations/supabase/client";
import { generarMemorandumBlob } from "@/components/MemorandumPDF";

interface MemoForPdf {
  numero: number;
  titulo: string;
  contenido: string;
  destinatarioNombre: string;
  fecha: string;
  empresa: any;
  grupo: any;
}

/**
 * Generates a memorandum PDF blob, uploads it to storage,
 * and returns the public URL for embedding in emails.
 */
export async function uploadMemoPdfAndGetUrl(data: MemoForPdf): Promise<string | null> {
  try {
    const blob = await generarMemorandumBlob(data);
    const fileName = `memo_${data.numero}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("memorandums-pdf")
      .upload(fileName, blob, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("memorandums-pdf")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Error generating/uploading PDF:", err);
    return null;
  }
}
