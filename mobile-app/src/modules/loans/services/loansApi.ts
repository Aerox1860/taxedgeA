import { apiClient } from "../../../core/api/apiClient";
import { apiEndpoints } from "../../../core/api/apiEndpoints";
import type {
  LoanApplicationDraft,
  LoanApplicationResponse,
  LoanDocumentItem,
  LoanServiceItem,
} from "../types/loans.types";
import { LOAN_SERVICES } from "../mock/loanServices";
import { Platform } from "react-native";
import type { PropertyLoanDocumentResponse } from "./propertyLoanTypes";

export const loansApi = {
  getLoanServices: async (): Promise<LoanServiceItem[]> => {
    try {
      const res = await apiClient.get<LoanServiceItem[]>(apiEndpoints.loans.services);
      return res && res.length > 0 ? res : LOAN_SERVICES;
    } catch {
      return LOAN_SERVICES;
    }
  },

  createPropertyLoanDraft: async (
    draft: Partial<LoanApplicationDraft> & { isConsentChecked?: boolean },
  ): Promise<LoanApplicationResponse> =>
    apiClient.post<LoanApplicationResponse>(apiEndpoints.loans.propertyLoans, draft),

  updatePropertyLoanDraft: async (
    applicationId: string,
    draft: Partial<LoanApplicationDraft> & { isConsentChecked?: boolean },
  ): Promise<LoanApplicationResponse> =>
    apiClient.put<LoanApplicationResponse>(apiEndpoints.loans.propertyLoan(applicationId), draft),

  submitPropertyLoan: async (applicationId: string): Promise<LoanApplicationResponse> =>
    apiClient.post<LoanApplicationResponse>(apiEndpoints.loans.propertyLoanSubmit(applicationId)),

  uploadLoanDocument: async (
    applicationId: string,
    document: LoanDocumentItem,
  ): Promise<PropertyLoanDocumentResponse> => {
    if (!document.fileUri) throw new Error(`File is missing for ${document.id}`);
    const form = new FormData();
    form.append("documentType", document.id);
    const uriName = document.fileUri.split(/[/?]/).pop();
    const fileName = document.fileName || uriName || `${document.id}.jpg`;
    const mimeType = fileName.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : fileName.toLowerCase().match(/\.(jpe?g)$/)
        ? "image/jpeg"
        : fileName.toLowerCase().endsWith(".png")
          ? "image/png"
          : fileName.toLowerCase().endsWith(".webp")
            ? "image/webp"
          : "image/jpeg";
    if (Platform.OS === "web") {
      const fileResponse = await fetch(document.fileUri);
      if (!fileResponse.ok) throw new Error(`Unable to read selected document ${fileName}.`);
      form.append("file", await fileResponse.blob(), fileName);
    } else {
      form.append("file", {
        uri: document.fileUri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);
    }
    return apiClient.post<PropertyLoanDocumentResponse>(
      apiEndpoints.loans.propertyLoanDocuments(applicationId),
      form,
    );
  },

  listLoanDocuments: async (applicationId: string): Promise<PropertyLoanDocumentResponse[]> =>
    apiClient.get<PropertyLoanDocumentResponse[]>(apiEndpoints.loans.propertyLoanDocuments(applicationId)),

  deleteLoanDocument: async (applicationId: string, documentId: number): Promise<void> =>
    apiClient.delete<void>(apiEndpoints.loans.propertyLoanDocument(applicationId, documentId)),

  downloadLoanDocument: async (applicationId: string, documentId: number): Promise<Blob> =>
    apiClient.getBlob(apiEndpoints.loans.propertyLoanDocumentContent(applicationId, documentId)),

  fetchStatus: async (
    applicationId: string
  ): Promise<LoanApplicationResponse> =>
    apiClient.get<LoanApplicationResponse>(apiEndpoints.loans.propertyLoanStatus(applicationId)),
};

export default loansApi;
