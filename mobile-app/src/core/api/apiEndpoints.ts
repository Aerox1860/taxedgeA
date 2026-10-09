export const apiEndpoints = {
  auth: {
    refresh: "/auth/refresh",
    revoke: "/auth/revoke",
    validate: "/auth/validate",
    createPasscode: "/auth/create-passcode",
  },
  customer: {
    login: "/customer/login",
    register: "/customer/register",
    exists: (mobileNumber: string) =>
      `/customer/exists/${encodeURIComponent(mobileNumber)}`,
    details: (customerId: string) =>
      `/customer/details/${encodeURIComponent(customerId)}`,
    update: "/customer/update",
    updatePassword: "/customer/update_password",
  },
  otp: {
    generate: "/otp/generate",
    verify: "/otp/verify",
  },
  system: {
    health: "/actuator/health",
  },
  gst: {
    complianceCreate: "/gst/compliance/create",
    cancellation: "/gst/cancellation",
    businessRegister: "/gst/business/register",
    businessUpdate: (gstId: string) =>
      `/gst/business/update/${encodeURIComponent(gstId)}`,
    documentUpload: "/gst/documents/upload",
    filingCreate: "/gst/filing/create",
    filing: (filingId: string) =>
      `/gst/filing/${encodeURIComponent(filingId)}`,
    filingDocumentUpload: "/gst/filing/documents/upload",
    status: (applicationId: string) =>
      `/gst/status/${encodeURIComponent(applicationId)}`,
    amendment: {
      legalName: (gstId: string) =>
        `/gst/amendments/legal-name/${encodeURIComponent(gstId)}`,
      principalPlace: (gstId: string) =>
        `/gst/amendments/principal-place/${encodeURIComponent(gstId)}`,
      additionalPlace: (gstId: string) =>
        `/gst/amendments/additional-place/${encodeURIComponent(gstId)}`,
      bankAccount: (gstId: string) =>
        `/gst/amendments/bank-account/${encodeURIComponent(gstId)}`,
      contact: (gstId: string) =>
        `/gst/amendments/contact/${encodeURIComponent(gstId)}`,
      signatory: (gstId: string) =>
        `/gst/amendments/signatory/${encodeURIComponent(gstId)}`,
    },
  },
  companyRegistration: {
    collection: "/api/v1/company-registrations",
    application: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}`,
    persons: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/persons`,
    person: (applicationId: string | number, personId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/persons/${encodeURIComponent(String(personId))}`,
    documents: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/documents`,
    documentContent: (
      applicationId: string | number,
      documentId: string | number,
    ) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/documents/${encodeURIComponent(String(documentId))}/content`,
    document: (applicationId: string | number, documentId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/documents/${encodeURIComponent(String(documentId))}`,
    tracking: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/tracking`,
    receipt: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/receipt`,
    payment: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/payment`,
    submit: (applicationId: string | number) =>
      `/api/v1/company-registrations/${encodeURIComponent(String(applicationId))}/submit`,
    apply: "/company-registration/apply",
    checkName: "/company-registration/check-name",
    status: (applicationId: string | number) =>
      `/company-registration/status/${encodeURIComponent(String(applicationId))}`,
  },
  loans: {
    services: "/loans/services",
    propertyLoans: "/api/v1/property-loans",
    propertyLoan: (applicationId: string) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}`,
    propertyLoanSubmit: (applicationId: string) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}/submit`,
    propertyLoanDocuments: (applicationId: string) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}/documents`,
    propertyLoanDocument: (applicationId: string, documentId: number) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(String(documentId))}`,
    propertyLoanDocumentContent: (
      applicationId: string,
      documentId: number,
    ) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(String(documentId))}/content`,
    propertyLoanStatus: (applicationId: string) =>
      `/api/v1/property-loans/${encodeURIComponent(applicationId)}/status`,
  },
  tds: {
    refundBankAccountSave: "/itr/refund-bank-account/save",
    refundBankAccount: (id: string) =>
      `/itr/refund-bank-account/${encodeURIComponent(id)}`,
    refundBankAccountByCustomer: (customerId: string) =>
      `/itr/refund-bank-account/customer/${encodeURIComponent(customerId)}`,
    incomeTaxInfoSave: "/itr/income-tax-info/save",
    incomeTaxInfo: (refundId: string) =>
      `/itr/income-tax-info/${encodeURIComponent(refundId)}`,
    taxesPaidSave: "/itr/tds-taxes-paid/save",
    taxesPaid: (refundId: string) =>
      `/itr/tds-taxes-paid/${encodeURIComponent(refundId)}`,
    documentsSave: "/itr/tds-documents/save",
    documents: (refundId: string) =>
      `/itr/tds-documents/${encodeURIComponent(refundId)}`,
    calculate: "/tds-refund/calculate",
    apply: "/tds-refund/apply",
    pay: "/tds-refund/pay",
    status: (applicationId: string) =>
      `/tds-refund/status/${encodeURIComponent(applicationId)}`,
  },
  external: {
    ifscLookup: (ifsc: string) => `/${encodeURIComponent(ifsc)}`,
    postalCodeLookup: (pinCode: string) =>
      `/pincode/${encodeURIComponent(pinCode)}`,
  },
} as const;
