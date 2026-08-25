import { supabase } from "@/integrations/supabase/client";
import { generarMemorandumBlob } from "@/components/MemorandumPDF";

interface MemoForPdf {
  id?: string;
  numero: number;
  titulo: string;
  contenido: string;
  destinatarioNombre: string;
  fecha: string;
  empresa: any;
  grupo: any;
}

/**
 * Generates a memorandum PDF blob, uploads it to private storage,
 * and returns a temporary signed URL for embedding in emails.
 */
export async function uploadMemoPdfAndGetUrl(data: MemoForPdf): Promise<string | null> {
  try {
    const blob = await generarMemorandumBlob(data);
    const folder = data.id || `memo_${data.numero}`;
    const fileName = `${folder}/memo_${data.numero}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("memorandums-pdf")
      .upload(fileName, blob, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from("memorandums-pdf")
      .createSignedUrl(fileName, 60 * 60 * 24 * 14);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return null;
    }

    return urlData.signedUrl;
  } catch (err) {
    console.error("Error generating/uploading PDF:", err);
    return null;
  }
}
