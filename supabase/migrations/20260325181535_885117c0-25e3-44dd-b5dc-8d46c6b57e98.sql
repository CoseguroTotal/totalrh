-- Create public bucket for memorandum PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('memorandums-pdf', 'memorandums-pdf', true);

-- Allow authenticated users to upload/read/delete
CREATE POLICY "auth_upload_memo_pdf" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memorandums-pdf');
CREATE POLICY "public_read_memo_pdf" ON storage.objects FOR SELECT USING (bucket_id = 'memorandums-pdf');
CREATE POLICY "auth_delete_memo_pdf" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'memorandums-pdf');