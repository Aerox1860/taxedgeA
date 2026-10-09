export interface PropertyLoanDocumentResponse {
  id: number;
  documentType: string;
  documentName: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  required: boolean;
  uploadedAt: string;
  contentUrl: string;
}
