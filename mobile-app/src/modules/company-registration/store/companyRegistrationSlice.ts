import { create } from 'zustand';
import type { CompanyRegistrationDraft, LinkedRegistrations, CompanyDoc, CompanyDocumentType } from '../types/registration.types';
import type { CompanyType, CompanyDetails } from '../types/company.types';
import type { DirectorInfo, OpcNomineeInfo, PartnerInfo } from '../types/director.types';
import {
  companyRegistrationApi,
  type RegistrationDetails,
  type RegistrationDocument,
  type RegistrationPerson,
  type PersonRequest,
} from '../services/companyRegistrationApi';
import { companyRegistrationService } from '../services/companyRegistrationService';

interface CompanyRegistrationState {
  draft: CompanyRegistrationDraft;
  pendingPersonRequests: number;
  setCompanyType: (type: CompanyType) => void;
  updateCompanyDetails: (details: Partial<CompanyDetails>) => void;
  addDirector: (director: DirectorInfo) => void;
  saveDirectorToBackend: (id: string, director: Partial<DirectorInfo>) => Promise<number>;
  updateDirector: (id: string, director: Partial<DirectorInfo>) => void;
  removeDirector: (id: string) => void;
  removeDirectorFromBackend: (id: string) => Promise<void>;
  addPartner: (partner: PartnerInfo) => void;
  removePartner: (id: string) => void;
  setOpcNominee: (nominee: OpcNomineeInfo) => void;
  toggleLinkedRegistration: (key: keyof LinkedRegistrations) => void;
  uploadRegistrationDocument: (document: CompanyDoc) => Promise<number>;
  removeRegistrationDocument: (documentId: CompanyDocumentType) => Promise<void>;
  refreshRegistrationDocuments: () => Promise<void>;
  setStep: (step: number) => void;
  saveWorkflowProgress: (nextStep: number) => Promise<number>;
  saveCurrentStep: (step: number) => Promise<number>;
  hydrateFromBackend: (applicationId?: string | number, stepOverride?: number) => Promise<void>;
  resetRegistration: () => void;
}

const COMPANY_TYPES: CompanyType[] = [
  'Private Limited',
  'One Person Company (OPC)',
  'Section 8 (NGO)',
  'Public Limited',
  'Limited Liability Partnership (LLP)',
  'Sole Proprietorship',
];

const toCompanyType = (value: string): CompanyType => {
  if (!COMPANY_TYPES.includes(value as CompanyType)) {
    throw new Error(`Unsupported company type returned by the backend: ${value}`);
  }
  return value as CompanyType;
};

const toUiDate = (value: string | null): string | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Unsupported date returned by the backend: ${value}`);
  return value;
};

const toBackendDate = (value: string | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) throw new Error(`Date of birth must use DD-MM-YYYY format: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const toBackendPercentage = (value: number | undefined): number | undefined =>
  value === undefined ? undefined : Number(value.toFixed(2));

const toNameAvailabilityStatus = (
  value: string | null | undefined,
): CompanyDetails['nameAvailabilityStatus'] => {
  if (value === null || value === undefined) return undefined;
  if (value === 'Available' || value === 'Pending Verification' || value === 'Reserved') {
    return value;
  }
  throw new Error(`Unsupported name availability status returned by the backend: ${value}`);
};

const getFeeBreakdown = (companyType: CompanyType) => {
  const professionalFee =
    companyRegistrationService.getCompanyTypes().find((option) => option.type === companyType)?.fee ?? 4999;
  const gstAmount = Math.round(professionalFee * 0.18);
  const statutoryCharges = 1500;
  return {
    professionalFee,
    gstAmount,
    statutoryCharges,
    totalAmount: professionalFee + gstAmount + statutoryCharges,
  };
};

const createEmptyDraft = (): CompanyRegistrationDraft => ({
  id: '',
  company: {
    companyType: 'Private Limited',
    companyClass: 'Private',
    companyCategory: 'Company limited by Shares',
    companySubCategory: 'Indian Non-Government Company',
    primaryActivity: '',
    nicCode: '',
    secondaryActivity: '',
    proposedName1: '',
    proposedName2: '',
    nameSuffix: '',
    registeredAddressLine: '',
    registeredCity: '',
    registeredDistrict: '',
    registeredState: '',
    registeredPincode: '',
    premisesOwnership: 'Owned',
    companyEmail: '',
    companyMobile: '',
    authorizedCapital: 0,
    paidUpCapital: 0,
    numberOfShares: 0,
    faceValuePerShare: 0,
  },
  directors: [],
  partners: [],
  documents: [
    { id: 'DIRECTOR_PAN', name: 'PAN Card of all Directors / Promoters', category: 'Promoter KYC', required: true, status: 'Pending' },
    { id: 'DIRECTOR_ID_PROOF', name: 'Aadhaar / Passport / Voter ID', category: 'Promoter KYC', required: true, status: 'Pending' },
    { id: 'REGISTERED_OFFICE_PROOF', name: 'Registered Office Ownership / Lease Proof', category: 'Office Proof', required: true, status: 'Pending' },
    { id: 'OFFICE_UTILITY_BILL', name: 'Utility Bill (Electricity / Water)', category: 'Office Proof', required: true, status: 'Pending' },
    { id: 'PROPERTY_OWNER_NOC', name: 'Property Owner No Objection Certificate (NOC)', category: 'Office Proof', required: false, status: 'Pending' },
  ],
  linkedRegistrations: {
    pan: false,
    tan: false,
    gst: false,
    esic: false,
    epfo: false,
    professionalTax: false,
    bankAccount: false,
  },
  feeBreakdown: getFeeBreakdown('Private Limited'),
  trackingStages: [],
  currentStep: 0,
  totalFee: getFeeBreakdown('Private Limited').totalAmount,
  paymentStatus: 'Pending',
  status: 'Draft',
  createdAt: new Date().toISOString(),
});

const mapServerDocument = (document: RegistrationDocument, existing?: CompanyDoc): CompanyDoc => ({
  id: document.documentType,
  documentId: document.id ?? existing?.documentId,
  name: document.name || existing?.name || document.documentType,
  category: document.category || existing?.category || '',
  required: document.required ?? existing?.required ?? false,
  status: String(document.status).toUpperCase() === 'UPLOADED' && Boolean(document.fileUri)
    ? 'Uploaded'
    : 'Pending',
  fileUri: document.fileUri || undefined,
  fileName: document.fileName || undefined,
  fileSize: document.fileSize ?? existing?.fileSize,
  mimeType: document.mimeType ?? existing?.mimeType,
  uploadedAt: document.uploadedAt ?? existing?.uploadedAt,
  verifiedAt: document.verifiedAt ?? existing?.verifiedAt ?? undefined,
  remarks: document.remarks ?? existing?.remarks ?? undefined,
});

const mapBackendDraft = (data: RegistrationDetails): CompanyRegistrationDraft => {
  const base = createEmptyDraft();
  const companyType = toCompanyType(data.application.companyType);
  const defaultFees = getFeeBreakdown(companyType);
  const company = data.companyDetails;
  const office = data.registeredOffice;
  const capital = data.capital;
  const people = data.persons;
  const payment = data.payments[0];
  const serverDocuments = data.documents;
  const serverDocumentsByType = new Map(
    serverDocuments.map((document) => [document.documentType, document]),
  );

  return {
    ...base,
    id: String(data.application.id),
    company: {
      ...base.company,
      companyType,
      industryCategory: company?.industryCategory || '',
      businessActivityDescription: company?.businessActivityDescription || '',
      companyClass: company?.companyClass === 'Public' ? 'Public' : 'Private',
      companyCategory: company?.companyCategory === 'Company limited by Guarantee' ||
        company?.companyCategory === 'Unlimited Company'
        ? company.companyCategory
        : 'Company limited by Shares',
      companySubCategory: company?.companySubCategory === 'State Government Company' ||
        company?.companySubCategory === 'Central Government Company'
        ? company.companySubCategory
        : 'Indian Non-Government Company',
      primaryActivity: company?.primaryActivity || '',
      nicCode: company?.nicCode || '',
      secondaryActivity: company?.secondaryActivity || '',
      proposedName1: company?.proposedName1 || '',
      proposedName2: company?.proposedName2 || '',
      proposedName3: company?.proposedName3 || undefined,
      nameSuffix: company?.nameSuffix || '',
      nameAvailabilityStatus: toNameAvailabilityStatus(company?.nameAvailabilityStatus),
      registeredAddressLine: office?.addressLine || '',
      registeredCity: office?.city || '',
      registeredDistrict: office?.district || '',
      registeredState: office?.state || '',
      registeredPincode: office?.pincode || '',
      premisesOwnership: office?.premisesOwnership === 'Rented' ||
        office?.premisesOwnership === 'Leased'
        ? office.premisesOwnership
        : 'Owned',
      companyEmail: company?.companyEmail || '',
      companyMobile: company?.companyMobile || '',
      officeAddressProofName: office?.officeAddressProofName || undefined,
      officeAddressProofUri: office?.officeAddressProofUri || undefined,
      ownershipDocName: office?.ownershipDocName || undefined,
      ownershipDocUri: office?.ownershipDocUri || undefined,
      ownerNocName: office?.ownerNocName || undefined,
      ownerNocUri: office?.ownerNocUri || undefined,
      authorizedCapital: Number(capital?.authorizedCapital ?? company?.authorizedCapital ?? 0),
      paidUpCapital: Number(capital?.paidUpCapital ?? company?.paidUpCapital ?? 0),
      numberOfShares: Number(capital?.numberOfShares ?? company?.numberOfShares ?? 0),
      faceValuePerShare: Number(capital?.faceValuePerShare ?? company?.faceValuePerShare ?? 0),
    },
    directors: people
      .filter((person) => person.personType !== 'PARTNER' && person.personType !== 'NOMINEE')
      .map((person) => mapDirector(person)),
    partners: people
      .filter((person) => person.personType === 'PARTNER')
      .map((person) => mapPartner(person)),
    opcNominee: people.find((person) => person.personType === 'NOMINEE')
      ? mapNominee(people.find((person) => person.personType === 'NOMINEE')!)
      : undefined,
    documents: [
      ...base.documents.map((document) => {
        const serverDocument = serverDocumentsByType.get(document.id);
        return serverDocument ? mapServerDocument(serverDocument, document) : document;
      }),
      ...serverDocuments
        .filter((document) => !base.documents.some((existing) => existing.id === document.documentType))
        .map((document) => mapServerDocument(document)),
    ],
    linkedRegistrations: { ...base.linkedRegistrations, ...(data.linkedRegistrations || {}) },
    feeBreakdown: payment
      ? {
          professionalFee: Number(payment.professionalFee || 0),
          gstAmount: Number(payment.totalAmount || 0) -
            Number(payment.professionalFee || 0) -
            Number(payment.governmentFee || 0),
          statutoryCharges: Number(payment.governmentFee || 0),
          totalAmount: Number(payment.totalAmount || 0),
        }
      : defaultFees,
    totalFee: Number(payment?.totalAmount ?? defaultFees.totalAmount),
    trackingStages: data.tracking.map((stage, index) => ({
      id: String(stage.id || index),
      title: stage.stage,
      description: stage.description || '',
      status: stage.status === 'COMPLETED' ? 'completed' : stage.status === 'CURRENT' ? 'current' : 'pending',
    })),
    currentStep: Math.min(Number(data.application.currentStep || 0), 11),
    paymentStatus: payment?.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
    status: data.application.status === 'SUBMITTED'
      ? 'Submitted'
      : data.application.status === 'IN_PROGRESS' || data.application.status === 'PAYMENT_SUCCESS'
        ? 'Under Review'
        : 'Draft',
    createdAt: data.application.createdAt || new Date().toISOString(),
  };
};

const mapDirector = (person: RegistrationPerson): DirectorInfo => ({
  id: String(person.id),
  name: person.name,
  pan: person.pan,
  aadhaar: person.aadhaar || undefined,
  dob: toUiDate(person.dob),
  fatherName: person.fatherName || undefined,
  gender: person.gender || undefined,
  nationality: person.nationality || undefined,
  placeOfBirth: person.placeOfBirth || undefined,
  occupation: person.occupation || undefined,
  educationalQualification: person.educationalQualification || undefined,
  designation: person.designation || undefined,
  category: person.category || undefined,
  email: person.email,
  phone: person.phone || undefined,
  hasDin: person.hasDin ?? undefined,
  din: person.din || undefined,
  hasDsc: person.hasDsc ?? undefined,
  sharesPercentage: person.sharesPercentage ?? undefined,
  residentialAddress: person.residentialAddress || undefined,
  isResidentInIndia: person.isResidentInIndia ?? undefined,
  addressLine1: person.addressLine1 || undefined,
  addressLine2: person.addressLine2 || undefined,
  city: person.city || undefined,
  district: person.district || undefined,
  state: person.state || undefined,
  pinCode: person.pinCode || undefined,
  sameAsPermanentAddress: person.sameAsPermanentAddress ?? undefined,
  presentAddressLine1: person.presentAddressLine1 || undefined,
  presentAddressLine2: person.presentAddressLine2 || undefined,
  presentCity: person.presentCity || undefined,
  presentDistrict: person.presentDistrict || undefined,
  presentState: person.presentState || undefined,
  presentPincode: person.presentPincode || undefined,
  numberOfShares: person.numberOfShares ?? undefined,
  amountSubscribed: person.amountSubscribed ?? undefined,
  identityProofDocName: person.identityProofDocName || undefined,
  residentialAddressProofDocName: person.residentialAddressProofDocName || undefined,
});

const mapPartner = (person: RegistrationPerson): PartnerInfo => ({
  id: String(person.id),
  name: person.name,
  pan: person.pan,
  aadhaar: person.aadhaar || '',
  email: person.email,
  phone: person.phone || '',
  contributionAmount: Number(person.contributionAmount || 0),
  profitSharePercentage: Number(person.profitSharePercentage || 0),
  capitalContribution: Number(person.capitalContribution || 0),
  profitSharingRatio: Number(person.profitSharingRatio || 0),
});

const mapNominee = (person: RegistrationPerson): OpcNomineeInfo => ({
  name: person.name || '',
  pan: person.pan || '',
  aadhaar: person.aadhaar || '',
  email: person.email || '',
  phone: person.phone || '',
  relationship: person.relationship || '',
});

const toPersonRequest = (
  person: DirectorInfo | PartnerInfo | OpcNomineeInfo,
  personType: string,
): PersonRequest => {
  const director = 'designation' in person ? person : undefined;
  const partner = 'contributionAmount' in person ? person : undefined;
  const id = 'id' in person ? person.id : undefined;
  return {
    id: id && isDatabaseId(id) ? Number(id) : undefined,
    personType,
    name: person.name,
    pan: person.pan,
    aadhaar: person.aadhaar || undefined,
    dob: director ? toBackendDate(director.dob) : undefined,
    fatherName: director?.fatherName,
    gender: director?.gender,
    nationality: director?.nationality,
    placeOfBirth: director?.placeOfBirth,
    occupation: director?.occupation,
    educationalQualification: director?.educationalQualification,
    designation: director?.designation,
    category: director?.category,
    email: person.email,
    phone: person.phone || undefined,
    hasDin: director?.hasDin,
    din: director?.din,
    hasDsc: director?.hasDsc,
    sharesPercentage: toBackendPercentage(director?.sharesPercentage),
    residentialAddress: director?.residentialAddress,
    isResidentInIndia: director?.isResidentInIndia,
    addressLine1: director?.addressLine1,
    addressLine2: director?.addressLine2,
    city: director?.city,
    district: director?.district,
    state: director?.state,
    pinCode: director?.pinCode,
    sameAsPermanentAddress: director?.sameAsPermanentAddress,
    presentAddressLine1: director?.presentAddressLine1,
    presentAddressLine2: director?.presentAddressLine2,
    presentCity: director?.presentCity,
    presentDistrict: director?.presentDistrict,
    presentState: director?.presentState,
    presentPincode: director?.presentPincode,
    numberOfShares: director?.numberOfShares,
    amountSubscribed: director?.amountSubscribed,
    contributionAmount: partner?.contributionAmount,
    profitSharePercentage: partner?.profitSharePercentage,
    capitalContribution: partner?.capitalContribution,
    profitSharingRatio: partner?.profitSharingRatio,
    relationship: 'relationship' in person ? person.relationship : undefined,
    identityProofDocName: director?.identityProofDocName,
    residentialAddressProofDocName: director?.residentialAddressProofDocName,
  };
};

const isDatabaseId = (id: string) => /^\d+$/.test(id);

let registrationStateRevision = 0;

const toCompanyDetailsRequest = (company: CompanyDetails) => ({
  industryCategory: company.industryCategory,
  businessActivityDescription: company.businessActivityDescription,
  companyClass: company.companyClass,
  companyCategory: company.companyCategory,
  companySubCategory: company.companySubCategory,
  primaryActivity: company.primaryActivity,
  nicCode: company.nicCode,
  secondaryActivity: company.secondaryActivity,
  proposedName1: company.proposedName1,
  proposedName2: company.proposedName2,
  proposedName3: company.proposedName3,
  nameSuffix: company.nameSuffix,
  nameAvailabilityStatus: company.nameAvailabilityStatus,
  companyEmail: company.companyEmail.trim() || undefined,
  companyMobile: company.companyMobile.trim() || undefined,
});

export const useCompanyRegistrationStore = create<CompanyRegistrationState>((set, get) => ({
  draft: createEmptyDraft(),
  pendingPersonRequests: 0,
  setCompanyType: (type) =>
    set((state) => {
      const isOpc = type === 'One Person Company (OPC)';
      let directors = state.draft.directors;
      if (isOpc && directors.length > 0) {
        directors = [{ ...directors[0], sharesPercentage: 100 }];
      }
      return {
        draft: {
          ...state.draft,
          company: { ...state.draft.company, companyType: type },
          feeBreakdown: getFeeBreakdown(type),
          totalFee: getFeeBreakdown(type).totalAmount,
          directors,
        },
      };
    }),
  updateCompanyDetails: (details) =>
    set((state) => ({
      draft: {
        ...state.draft,
        company: { ...state.draft.company, ...details },
      },
    })),
  addDirector: (director) =>
    set((state) => {
      if (state.draft.company.companyType === 'One Person Company (OPC)' && state.draft.directors.length >= 1) {
        return state;
      }
      return {
        draft: {
          ...state.draft,
          directors: [...state.draft.directors, director],
        },
      };
    }),
  saveDirectorToBackend: async (id, updatedFields) => {
    const draft = get().draft;
    if (!draft.id) {
      throw new Error('Save the company type before adding promoters or directors.');
    }

    const director = draft.directors.find((person) => person.id === id);
    if (!director) throw new Error('The promoter or director could not be found.');
    const updatedDirector = { ...director, ...updatedFields };
    const personRequest = toPersonRequest(updatedDirector, 'DIRECTOR');
    set((state) => ({ pendingPersonRequests: state.pendingPersonRequests + 1 }));
    try {
      const response = /^\d+$/.test(id)
        ? await companyRegistrationApi.updatePerson(draft.id, id, personRequest)
        : await companyRegistrationApi.addPerson(draft.id, personRequest);
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Promoter save returned unexpected status ${response.status}.`);
      }

      set((state) => ({
        draft: {
          ...state.draft,
          directors: state.draft.directors.map((person) => {
            return person.id === id ? { ...person, id: String(response.data.id) } : person;
          }),
        },
      }));
      return response.status;
    } finally {
      set((state) => ({ pendingPersonRequests: Math.max(0, state.pendingPersonRequests - 1) }));
    }
  },
  updateDirector: (id, updatedFields) =>
    set((state) => ({
      draft: {
        ...state.draft,
        directors: state.draft.directors.map((d) => (d.id === id ? { ...d, ...updatedFields } : d)),
      },
    })),
  removeDirector: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        directors: state.draft.directors.filter((d) => d.id !== id),
      },
    })),
  removeDirectorFromBackend: async (id) => {
    const draft = get().draft;
    set((state) => ({ pendingPersonRequests: state.pendingPersonRequests + 1 }));
    try {
      if (/^\d+$/.test(id)) {
        if (!draft.id) throw new Error('The company registration could not be found.');
        await companyRegistrationApi.deletePerson(draft.id, id);
      }
      set((state) => ({
        draft: {
          ...state.draft,
          directors: state.draft.directors.filter((director) => director.id !== id),
        },
      }));
    } finally {
      set((state) => ({ pendingPersonRequests: Math.max(0, state.pendingPersonRequests - 1) }));
    }
  },
  addPartner: (partner) =>
    set((state) => ({
      draft: {
        ...state.draft,
        partners: [...state.draft.partners, partner],
      },
    })),
  removePartner: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        partners: state.draft.partners.filter((p) => p.id !== id),
      },
    })),
  setOpcNominee: (opcNominee) =>
    set((state) => ({
      draft: { ...state.draft, opcNominee },
    })),
  toggleLinkedRegistration: (key) =>
    set((state) => ({
      draft: {
        ...state.draft,
        linkedRegistrations: {
          ...state.draft.linkedRegistrations,
          [key]: !state.draft.linkedRegistrations[key],
        },
      },
    })),
  refreshRegistrationDocuments: async () => {
    const applicationId = get().draft.id;
    if (!applicationId) return;
    const response = await companyRegistrationApi.documentsWithStatus(applicationId);
    console.log('[CompanyRegistrationDocuments] GET status', response.status);
    console.log('[CompanyRegistrationDocuments] GET response data', response.data.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      name: document.name,
      category: document.category,
      required: document.required,
      fileName: document.fileName,
      fileUri: document.fileUri,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      uploadedAt: document.uploadedAt,
      verifiedAt: document.verifiedAt,
      remarks: document.remarks,
    })));
    if (response.status !== 200) {
      throw new Error(`Document refresh returned unexpected status ${response.status}.`);
    }
    const serverDocuments = response.data;
    const serverByType = new Map(serverDocuments.map((document) => [document.documentType, document]));
    const documents = get().draft.documents.map((existing) => {
      const serverDocument = serverByType.get(existing.id);
      return serverDocument
        ? mapServerDocument(serverDocument, existing)
        : {
            ...existing,
            documentId: undefined,
            status: 'Pending' as const,
            fileUri: undefined,
            fileName: undefined,
            fileSize: undefined,
            mimeType: undefined,
            uploadedAt: undefined,
            verifiedAt: undefined,
            remarks: undefined,
          };
    });
    const knownTypes = new Set(documents.map((document) => document.id));
    documents.push(...serverDocuments
      .filter((document) => !knownTypes.has(document.documentType))
      .map((document) => mapServerDocument(document)));
    set((state) => ({ draft: { ...state.draft, documents } }));
    console.log('[CompanyRegistrationDocuments] final documents state', documents.map((document) => ({
      documentId: document.documentId,
      documentType: document.id,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      hasFileUri: Boolean(document.fileUri),
    })));
  },
  uploadRegistrationDocument: async (document) => {
    const applicationId = get().draft.id;
    if (!applicationId) throw new Error('Create the registration before uploading documents.');
    const response = await companyRegistrationApi.uploadDocument(applicationId, document);
    console.log('[CompanyRegistrationDocuments] upload response status', response.status);
    console.log('[CompanyRegistrationDocuments] upload response data', {
      id: response.data.id,
      documentType: response.data.documentType,
      name: response.data.name,
      category: response.data.category,
      required: response.data.required,
      fileName: response.data.fileName,
      fileUri: response.data.fileUri,
      fileSize: response.data.fileSize,
      mimeType: response.data.mimeType,
      status: response.data.status,
      uploadedAt: response.data.uploadedAt,
      verifiedAt: response.data.verifiedAt,
      remarks: response.data.remarks,
    });
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Document upload returned unexpected status ${response.status}.`);
    }
    await get().refreshRegistrationDocuments();
    return response.status;
  },
  removeRegistrationDocument: async (documentId) => {
    const applicationId = get().draft.id;
    if (!applicationId) throw new Error('Create the registration before removing documents.');
    const documents = await companyRegistrationApi.documents(applicationId);
    const matchingDocuments = documents.filter((document) => document.documentType === documentId);
    await Promise.all(matchingDocuments.map((document) => companyRegistrationApi.deleteDocument(applicationId, document.id)));
    await get().refreshRegistrationDocuments();
  },
  setStep: (currentStep) =>
    set((state) => ({
      draft: { ...state.draft, currentStep },
    })),
  saveWorkflowProgress: async (nextStep) => {
    const applicationId = get().draft.id;
    if (!applicationId) throw new Error('Company registration draft has not been created.');
    const response = await companyRegistrationApi.updateRegistration(applicationId, {
      currentStep: nextStep,
    });
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Progress save returned unexpected status ${response.status}.`);
    }
    return response.status;
  },
  saveCurrentStep: async (step) => {
    const draft = get().draft;
    const revision = registrationStateRevision;
    if (step === 0) {
      const response = draft.id
        ? await companyRegistrationApi.updateRegistration(draft.id, {
            companyType: draft.company.companyType,
            currentStep: 1,
          })
        : await companyRegistrationApi.createOrUpdate(undefined, draft.company.companyType, 1);
      const isCreateRequest = !draft.id;
      console.log(
        isCreateRequest ? '[CompanyRegistration] POST STATUS' : '[CompanyRegistration] SAVE STATUS',
        response.status,
      );
      console.log(isCreateRequest ? '[CompanyRegistration] POST RESPONSE' : '[CompanyRegistration] SAVE RESPONSE', {
        application: response.data?.application
          ? {
              id: response.data.application.id,
              applicationNumber: response.data.application.applicationNumber,
              status: response.data.application.status,
              currentStep: response.data.application.currentStep,
            }
          : null,
      });
      const application = response.data?.application;
      const registrationId = application?.id;
      if (registrationId === undefined || registrationId === null || !Number.isFinite(Number(registrationId))) {
        throw new Error('Company Registration API response did not include a valid application.id.');
      }
      if (revision !== registrationStateRevision) {
        throw new Error('The signed-in user changed while saving. Please retry with the current account.');
      }
      set((state) => ({
        draft: {
          ...state.draft,
          id: String(registrationId),
          currentStep: application.currentStep ?? 1,
        },
      }));
      console.log('[CompanyRegistration] CREATED REGISTRATION ID', String(registrationId));
      return response.status;
    }

    if (!draft.id) throw new Error('Company registration draft has not been created. Go back and continue from Company Type.');
    const applicationId = draft.id;

    if (step === 1) {
      const company = draft.company;
      const response = await companyRegistrationApi.updateRegistration(applicationId, {
        currentStep: 2,
        companyDetails: toCompanyDetailsRequest(company),
      });
      return response.status;
    }

    if (step === 2) {
      const company = draft.company;
      const response = await companyRegistrationApi.updateRegistration(applicationId, {
        currentStep: 3,
        companyDetails: toCompanyDetailsRequest(company),
        registeredOffice: {
          addressLine: company.registeredAddressLine,
          city: company.registeredCity,
          district: company.registeredDistrict,
          state: company.registeredState,
          pincode: company.registeredPincode,
          premisesOwnership: company.premisesOwnership,
          officeAddressProofName: company.officeAddressProofName,
          officeAddressProofUri: null,
          ownershipDocName: company.ownershipDocName,
          ownershipDocUri: null,
          ownerNocName: company.ownerNocName,
          ownerNocUri: null,
        },
      });
      return response.status;
    }

    if (step === 3) {
      // Add/Edit persist each person; Continue only marks this screen complete.
      return get().saveWorkflowProgress(4);
    }

    if (step === 4) {
      const desired = [
        ...draft.directors.map((person) => ({
          person: person.name,
          numberOfShares: Number(person.numberOfShares || 0),
          shareValue: Number(person.amountSubscribed || 0),
          percentage: Number(person.sharesPercentage || 0),
        })),
        ...draft.partners.map((person) => ({
          person: person.name,
          numberOfShares: 0,
          shareValue: Number(person.capitalContribution || person.contributionAmount || 0),
          percentage: Number(person.profitSharePercentage || 0),
        })),
      ];
      const company = draft.company;
      const response = await companyRegistrationApi.updateRegistration(applicationId, {
        currentStep: 5,
        capital: {
          authorizedCapital: company.authorizedCapital,
          paidUpCapital: company.paidUpCapital,
          numberOfShares: company.numberOfShares,
          faceValuePerShare: company.faceValuePerShare,
        },
        shareholdings: desired,
      });
      return response.status;
    }

    if (step === 5) {
      const response = await companyRegistrationApi.updateRegistration(applicationId, { currentStep: 6 });
      return response.status;
    }

    if (step === 6) {
      const response = await companyRegistrationApi.updateRegistration(applicationId, {
        currentStep: 7,
        linkedRegistrations: draft.linkedRegistrations,
      });
      return response.status;
    }

    if (step === 7) {
      const response = await companyRegistrationApi.updateRegistration(applicationId, { currentStep: 8 });
      return response.status;
    }

    throw new Error('Autosave is only enabled for the pre-payment wizard screens.');
  },
  hydrateFromBackend: async (applicationId, stepOverride) => {
    const revision = ++registrationStateRevision;
    let id = applicationId;
    if (id === undefined) {
      set({ draft: createEmptyDraft() });
      const registrations = await companyRegistrationApi.list();
      if (revision !== registrationStateRevision) return;
      const latestActive = registrations.find((registration) =>
        registration.status.toUpperCase() === 'SUBMITTED' ||
        (['DRAFT', 'IN_PROGRESS'].includes(registration.status.toUpperCase()) &&
          Number(registration.currentStep || 0) <= 8)
      );
      if (!latestActive) return;
      id = latestActive.id;
    }
    const details = await companyRegistrationApi.get(id);
    if (revision !== registrationStateRevision) return;
    const hydrated = mapBackendDraft(details);
    const currentStep = stepOverride ?? hydrated.currentStep;
    set({ draft: { ...hydrated, currentStep } });
  },
  resetRegistration: () => {
    registrationStateRevision += 1;
    set({ draft: createEmptyDraft(), pendingPersonRequests: 0 });
  },
}));
