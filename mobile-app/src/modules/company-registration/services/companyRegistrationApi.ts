import { apiClient } from "../../../core/api/apiClient";
import { apiEndpoints } from "../../../core/api/apiEndpoints";
import { Platform } from "react-native";
import type {
  CompanyDoc,
  CompanyDocumentType,
  CompanyRegistrationDraft,
  LinkedRegistrations,
} from "../types/registration.types";

export interface RegistrationSummary {
  id: number;
  applicationNumber: string;
  companyType: string;
  constitutionType: string | null;
  status: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationCompanyDetails {
  id: number | null;
  industryCategory: string | null;
  businessActivityDescription: string | null;
  companyClass: string | null;
  companyCategory: string | null;
  companySubCategory: string | null;
  primaryActivity: string | null;
  nicCode: string | null;
  secondaryActivity: string | null;
  proposedName1: string | null;
  proposedName2: string | null;
  proposedName3: string | null;
  nameSuffix: string | null;
  nameAvailabilityStatus: string | null;
  companyEmail: string | null;
  companyMobile: string | null;
  authorizedCapital: number | null;
  paidUpCapital: number | null;
  numberOfShares: number | null;
  faceValuePerShare: number | null;
}

export interface RegistrationOffice {
  id: number | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  premisesOwnership: string | null;
  officeAddressProofName: string | null;
  officeAddressProofUri: string | null;
  ownershipDocName: string | null;
  ownershipDocUri: string | null;
  ownerNocName: string | null;
  ownerNocUri: string | null;
}

export interface RegistrationPerson {
  id: number;
  personType: string;
  name: string;
  pan: string;
  aadhaar: string | null;
  dob: string | null;
  fatherName: string | null;
  gender: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  occupation: string | null;
  educationalQualification: string | null;
  designation: string | null;
  category: string | null;
  email: string;
  phone: string | null;
  hasDin: boolean | null;
  din: string | null;
  hasDsc: boolean | null;
  sharesPercentage: number | null;
  residentialAddress: string | null;
  isResidentInIndia: boolean | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pinCode: string | null;
  sameAsPermanentAddress: boolean | null;
  presentAddressLine1: string | null;
  presentAddressLine2: string | null;
  presentCity: string | null;
  presentDistrict: string | null;
  presentState: string | null;
  presentPincode: string | null;
  numberOfShares: number | null;
  amountSubscribed: number | null;
  contributionAmount: number | null;
  profitSharePercentage: number | null;
  capitalContribution: number | null;
  profitSharingRatio: number | null;
  relationship: string | null;
  identityProofDocName: string | null;
  residentialAddressProofDocName: string | null;
}

export interface RegistrationCapital {
  id: number | null;
  authorizedCapital: number | null;
  paidUpCapital: number | null;
  numberOfShares: number | null;
  faceValuePerShare: number | null;
}

export interface RegistrationShareholding {
  id: number;
  person: string | null;
  numberOfShares: number | null;
  shareValue: number | null;
  percentage: number | null;
}

export interface RegistrationDocument {
  id: number;
  custId: string;
  documentType: CompanyDocumentType;
  name: string | null;
  category: string | null;
  required: boolean;
  fileName: string;
  fileUri: string | null;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
  uploadedAt: string;
  verifiedAt: string | null;
  remarks: string | null;
}

export interface RegistrationPayment {
  id: number;
  amount: number;
  governmentFee: number | null;
  professionalFee: number | null;
  totalAmount: number | null;
  paymentStatus: string;
  transactionId: string | null;
  paymentGateway: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
}

export interface RegistrationTracking {
  id: number;
  stage: string;
  status: string;
  description: string | null;
  startedAt: string | null;
  completedAt: string | null;
  remarks: string | null;
}

export interface RegistrationDetails {
  application: RegistrationSummary;
  companyDetails: RegistrationCompanyDetails | null;
  registeredOffice: RegistrationOffice | null;
  persons: RegistrationPerson[];
  capital: RegistrationCapital | null;
  shareholdings: RegistrationShareholding[];
  documents: RegistrationDocument[];
  linkedRegistrations: LinkedRegistrations | null;
  payments: RegistrationPayment[];
  tracking: RegistrationTracking[];
}

export interface RegistrationSubmission {
  applicationId: number;
  applicationNumber: string;
  status: string;
  submittedAt: string | null;
}

export interface RegistrationReceipt {
  applicationId: number;
  applicationNumber: string;
  companyType: string;
  status: string;
  submittedAt: string | null;
  payment: RegistrationPayment | null;
}

export interface PersonRequest {
  id?: number;
  personType: string;
  name: string;
  pan: string;
  aadhaar?: string;
  dob?: string | null;
  fatherName?: string;
  gender?: string;
  nationality?: string;
  placeOfBirth?: string;
  occupation?: string;
  educationalQualification?: string;
  designation?: string;
  category?: string;
  email: string;
  phone?: string;
  hasDin?: boolean;
  din?: string;
  hasDsc?: boolean;
  sharesPercentage?: number;
  residentialAddress?: string;
  isResidentInIndia?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  sameAsPermanentAddress?: boolean;
  presentAddressLine1?: string;
  presentAddressLine2?: string;
  presentCity?: string;
  presentDistrict?: string;
  presentState?: string;
  presentPincode?: string;
  numberOfShares?: number;
  amountSubscribed?: number;
  contributionAmount?: number;
  profitSharePercentage?: number;
  capitalContribution?: number;
  profitSharingRatio?: number;
  relationship?: string;
  identityProofDocName?: string;
  residentialAddressProofDocName?: string;
}

export interface CompanyRegistrationUpdateRequest {
  companyType?: string;
  constitutionType?: string;
  currentStep?: number;
  companyDetails?: {
    industryCategory?: string;
    businessActivityDescription?: string;
    companyClass?: string;
    companyCategory?: string;
    companySubCategory?: string;
    primaryActivity?: string;
    nicCode?: string;
    secondaryActivity?: string;
    proposedName1?: string;
    proposedName2?: string;
    proposedName3?: string;
    nameSuffix?: string;
    nameAvailabilityStatus?: string;
    companyEmail?: string;
    companyMobile?: string;
  };
  registeredOffice?: {
    addressLine: string;
    city: string;
    district?: string;
    state: string;
    pincode: string;
    premisesOwnership?: string;
    officeAddressProofName?: string;
    officeAddressProofUri?: string | null;
    ownershipDocName?: string;
    ownershipDocUri?: string | null;
    ownerNocName?: string;
    ownerNocUri?: string | null;
  };
  persons?: PersonRequest[];
  capital?: {
    authorizedCapital: number;
    paidUpCapital: number;
    numberOfShares?: number;
    faceValuePerShare?: number;
  };
  shareholdings?: Array<{
    person?: string;
    numberOfShares?: number;
    shareValue?: number;
    percentage?: number;
    id?: number;
  }>;
  linkedRegistrations?: LinkedRegistrations;
}

export interface PaymentRequest {
  amount: number;
  governmentFee?: number;
  professionalFee?: number;
  totalAmount?: number;
  paymentStatus?: string;
  transactionId?: string;
  paymentGateway?: string;
  paymentMethod?: string;
}

export const companyRegistrationApi = {
  createOrUpdate: async (
    applicationId: string | number | undefined,
    companyType: string,
    currentStep: number,
  ) =>
    apiClient.postWithStatus<RegistrationDetails>(apiEndpoints.companyRegistration.collection, {
      companyType,
      currentStep,
      ...(applicationId ? { applicationId: Number(applicationId) } : {}),
    }),
  updateRegistration: async (
    applicationId: string | number,
    payload: CompanyRegistrationUpdateRequest,
  ) =>
    apiClient.putWithStatus<RegistrationDetails>(
      apiEndpoints.companyRegistration.application(applicationId),
      payload,
    ),
  addPerson: async (applicationId: string | number, person: PersonRequest) =>
    apiClient.postWithStatus<{ id: number; personType: string; pan: string }>(
      apiEndpoints.companyRegistration.persons(applicationId),
      person,
    ),
  updatePerson: async (
    applicationId: string | number,
    personId: string | number,
    person: PersonRequest,
  ) =>
    apiClient.putWithStatus<{ id: number; personType: string; pan: string }>(
      apiEndpoints.companyRegistration.person(applicationId, personId),
      person,
    ),
  deletePerson: async (applicationId: string | number, personId: string | number) =>
    apiClient.delete<void>(apiEndpoints.companyRegistration.person(applicationId, personId)),
  list: async () => apiClient.get<RegistrationSummary[]>(apiEndpoints.companyRegistration.collection),
  get: async (applicationId: string | number) =>
    apiClient.get<RegistrationDetails>(apiEndpoints.companyRegistration.application(applicationId)),
  documents: async (applicationId: string | number) =>
    apiClient.get<RegistrationDocument[]>(apiEndpoints.companyRegistration.documents(applicationId)),
  documentsWithStatus: async (applicationId: string | number) =>
    apiClient.getWithStatus<RegistrationDocument[]>(apiEndpoints.companyRegistration.documents(applicationId)),
  downloadDocument: async (applicationId: string | number, documentId: string | number) =>
    apiClient.getBlob(apiEndpoints.companyRegistration.documentContent(applicationId, documentId)),
  tracking: async (applicationId: string | number) =>
    apiClient.get<RegistrationTracking[]>(apiEndpoints.companyRegistration.tracking(applicationId)),
  receipt: async (applicationId: string | number) =>
    apiClient.get<RegistrationReceipt>(apiEndpoints.companyRegistration.receipt(applicationId)),
  deleteDocument: async (applicationId: string | number, documentId: string | number) =>
    apiClient.delete<void>(apiEndpoints.companyRegistration.document(applicationId, documentId)),
  submitApplication: async (draft: CompanyRegistrationDraft) =>
    apiClient.post<RegistrationSubmission>(apiEndpoints.companyRegistration.apply, draft),
  uploadDocument: async (applicationId: string | number, document: CompanyDoc) => {
    if (!document.fileUri) throw new Error(`File is missing for ${document.id}`);
    const form = new FormData();
    form.append("documentType", document.id);
    const fileName = document.fileName || `${document.id}.bin`;
    const extension = fileName.split(".").pop()?.toLowerCase();
    const inferredMimeType = extension === "pdf"
      ? "application/pdf"
      : extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
    const mimeType = document.mimeType || inferredMimeType;
    if (Platform.OS === "web") {
      const fileResponse = await fetch(document.fileUri);
      if (!fileResponse.ok) {
        throw new Error(`Unable to read selected file for ${document.id}`);
      }
      form.append("file", await fileResponse.blob(), fileName);
    } else {
      form.append(
        "file",
        { uri: document.fileUri, name: fileName, type: mimeType } as unknown as Blob,
      );
    }
    return apiClient.postWithStatus<RegistrationDocument>(
      apiEndpoints.companyRegistration.documents(applicationId),
      form,
    );
  },
  savePayment: async (applicationId: string | number, payload: PaymentRequest) =>
    apiClient.postWithStatus<RegistrationPayment>(
      apiEndpoints.companyRegistration.payment(applicationId),
      payload,
    ),
  submitRegistration: async (applicationId: string | number) =>
    apiClient.postWithStatus<RegistrationSubmission>(
      apiEndpoints.companyRegistration.submit(applicationId),
    ),
  checkNameAvailability: async (proposedName: string) =>
    apiClient.get<{ available: boolean; similarNames: string[] }>(
      apiEndpoints.companyRegistration.checkName,
      { params: { name: proposedName } },
    ),
  fetchStatus: async (applicationId: string | number) =>
    apiClient.get<{ status: string; currentStage: string }>(
      apiEndpoints.companyRegistration.status(applicationId),
    ),
};

export default companyRegistrationApi;
