package com.taxedge.propertyloan.service;

import com.taxedge.customer.entity.Customer;
import com.taxedge.customer.repository.CustomerRepository;
import com.taxedge.propertyloan.dto.PropertyLoanDocumentResponse;
import com.taxedge.propertyloan.dto.PropertyLoanRequest;
import com.taxedge.propertyloan.dto.PropertyLoanResponse;
import com.taxedge.propertyloan.entity.PropertyLoanApplicant;
import com.taxedge.propertyloan.entity.PropertyLoanApplication;
import com.taxedge.propertyloan.entity.PropertyLoanDocument;
import com.taxedge.propertyloan.entity.PropertyLoanOwnership;
import com.taxedge.propertyloan.entity.PropertyLoanProperty;
import com.taxedge.propertyloan.entity.PropertyLoanStatus;
import com.taxedge.propertyloan.repository.PropertyLoanApplicationRepository;
import com.taxedge.propertyloan.repository.PropertyLoanDocumentRepository;
import com.taxedge.security.jwt.JwtPrincipal;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyLoanServiceImpl implements PropertyLoanService {
    private static final Set<String> PURPOSES = Set.of(
            "Commercial Property Purchase",
            "Residential Property Mortgage (LAP)",
            "Commercial Mortgage Loan",
            "Industrial Factory / Land Mortgage",
            "Lease Rental Discounting (LRD)",
            "Business Expansion & Debt Consolidation",
            "Others");
    private static final Set<String> RELATIONSHIPS = Set.of(
            "Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Partner / Business Associate");
    private static final Map<String, DocumentDefinition> DOCUMENTS = Map.ofEntries(
            Map.entry("pan", new DocumentDefinition("PAN Card", true)),
            Map.entry("aadhaar", new DocumentDefinition("Aadhaar Card", true)),
            Map.entry("photograph", new DocumentDefinition("Passport Size Photograph", true)),
            Map.entry("address-proof", new DocumentDefinition("Address Proof", true)),
            Map.entry("bank-statements", new DocumentDefinition("Bank Statements (6-12 Months)", true)),
            Map.entry("salary-slips", new DocumentDefinition("Salary Slips / Income Proof", true)),
            Map.entry("form-16-itr", new DocumentDefinition("Form 16 / ITR & Computation (2 Years)", true)),
            Map.entry("sale-agreement", new DocumentDefinition("Agreement to Sell / Allotment Letter", true)),
            Map.entry("approved-plan", new DocumentDefinition("Approved Building Plan & Sanction Map", true)),
            Map.entry("title-deed", new DocumentDefinition("Title Deed / Chain of Deeds", true)),
            Map.entry("property-tax-ec", new DocumentDefinition("Encumbrance Certificate & Tax Receipts", false)),
            Map.entry("down-payment-receipts", new DocumentDefinition("Own Contribution / Down Payment Proof", false)));

    private final PropertyLoanApplicationRepository applicationRepository;
    private final CustomerRepository customerRepository;
    private final PropertyLoanDocumentRepository documentRepository;
    private final PropertyLoanFileStorage fileStorage;

    @Override
    @Transactional
    public PropertyLoanResponse create(PropertyLoanRequest request) {
        String custId = currentCustomerId();
        Customer customer = customerRepository.findById(custId)
                .orElseThrow(() -> new PropertyLoanException(HttpStatus.UNAUTHORIZED, "Authenticated customer was not found"));
        PropertyLoanApplication application = new PropertyLoanApplication();
        application.setCustomer(customer);
        application.setApplicationNumber("PL-" + UUID.randomUUID());
        application.setLoanType(defaultText(request.loanType(), "Property Loan"));
        application.setLoanTypeId(defaultText(request.loanTypeId(), "property-loan"));
        application.setStatus(PropertyLoanStatus.DRAFT);
        apply(application, request);
        try {
            application = applicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException exception) {
            throw new PropertyLoanException(HttpStatus.CONFLICT, "Property Loan application could not be created", exception);
        }
        application.setApplicationNumber(String.format("PL-%s-%06d",
                LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE), application.getId()));
        return toResponse(applicationRepository.saveAndFlush(application));
    }

    @Override
    @Transactional
    public PropertyLoanResponse update(Long id, PropertyLoanRequest request) {
        PropertyLoanApplication application = owned(id);
        if (application.getStatus() != PropertyLoanStatus.DRAFT) {
            throw new PropertyLoanException(HttpStatus.CONFLICT, "Only draft Property Loan applications can be edited");
        }
        apply(application, request);
        return toResponse(applicationRepository.saveAndFlush(application));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyLoanResponse> mine() {
        return applicationRepository.findAllByCustomer_CustIdOrderByCreatedAtDesc(currentCustomerId())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PropertyLoanResponse get(Long id) {
        return toResponse(owned(id));
    }

    @Override
    @Transactional
    public PropertyLoanResponse submit(Long id) {
        PropertyLoanApplication application = owned(id);
        if (application.getStatus() != PropertyLoanStatus.DRAFT) {
            throw new PropertyLoanException(HttpStatus.CONFLICT, "Only draft Property Loan applications can be submitted");
        }
        validateForSubmission(application);
        application.setStatus(PropertyLoanStatus.SUBMITTED);
        application.setSubmittedAt(LocalDateTime.now());
        return toResponse(applicationRepository.saveAndFlush(application));
    }

    @Override
    @Transactional(readOnly = true)
    public PropertyLoanResponse status(Long id) {
        return toResponse(owned(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PropertyLoanDocumentResponse> documents(Long id) {
        owned(id);
        return documentRepository.findAllByApplication_IdOrderByUploadedAtDesc(id)
                .stream().map(this::toDocumentResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PropertyLoanDocumentResponse document(Long id, Long documentId) {
        owned(id);
        return toDocumentResponse(findDocument(id, documentId));
    }

    @Override
    @Transactional
    public PropertyLoanDocumentResponse uploadDocument(Long id, String documentType, MultipartFile file) {
        PropertyLoanApplication application = owned(id);
        if (application.getStatus() != PropertyLoanStatus.DRAFT) {
            throw new PropertyLoanException(HttpStatus.CONFLICT, "Documents can only be changed while the application is a draft");
        }
        DocumentDefinition definition = DOCUMENTS.get(documentType);
        if (definition == null) throw new PropertyLoanException(HttpStatus.BAD_REQUEST, "Unsupported document type");
        validateUpload(file);
        String newFilePath = null;
        try {
            newFilePath = fileStorage.store(id, file);
            PropertyLoanDocument document = documentRepository
                    .findAllByApplication_IdOrderByUploadedAtDesc(id).stream()
                    .filter(existing -> existing.getDocumentType().equals(documentType))
                    .findFirst().orElseGet(PropertyLoanDocument::new);
            String previousPath = document.getFilePath();
            document.setApplication(application);
            document.setDocumentType(documentType);
            document.setDocumentName(definition.name());
            document.setFileName(safeFileName(file.getOriginalFilename()));
            document.setFilePath(newFilePath);
            document.setFileSize(file.getSize());
            document.setContentType(file.getContentType().toLowerCase(Locale.ROOT));
            document.setRequired(definition.required());
            document.setUploadedAt(LocalDateTime.now());
            document = documentRepository.saveAndFlush(document);
            scheduleFileCleanup(newFilePath, previousPath);
            return toDocumentResponse(document);
        } catch (IOException exception) {
            deleteStoredFileAfterFailure(newFilePath, exception);
            throw new PropertyLoanException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store uploaded document", exception);
        } catch (RuntimeException exception) {
            deleteStoredFileAfterFailure(newFilePath, exception);
            throw exception;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Resource documentContent(Long id, Long documentId) throws IOException {
        owned(id);
        PropertyLoanDocument document = findDocument(id, documentId);
        return fileStorage.load(document.getFilePath());
    }

    @Override
    @Transactional
    public void deleteDocument(Long id, Long documentId) {
        PropertyLoanApplication application = owned(id);
        if (application.getStatus() != PropertyLoanStatus.DRAFT) {
            throw new PropertyLoanException(HttpStatus.CONFLICT, "Documents can only be changed while the application is a draft");
        }
        PropertyLoanDocument document = findDocument(id, documentId);
        String path = document.getFilePath();
        documentRepository.delete(document);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_COMMITTED) deleteStoredFileQuietly(path);
                }
            });
        }
    }

    private void apply(PropertyLoanApplication application, PropertyLoanRequest request) {
        if (request == null) throw new PropertyLoanException(HttpStatus.BAD_REQUEST, "Request body is required");
        if (StringUtils.hasText(request.loanType())) application.setLoanType(request.loanType().trim());
        if (StringUtils.hasText(request.loanTypeId())) application.setLoanTypeId(request.loanTypeId().trim());
        PropertyLoanRequest.LoanDetails loan = request.loanDetails();
        if (loan != null) {
            if (StringUtils.hasText(loan.loanType())) application.setLoanType(loan.loanType().trim());
            if (loan.purpose() != null) {
                String selectedPurpose = blankToNull(loan.purpose());
                if (selectedPurpose != null && !PURPOSES.contains(selectedPurpose) && !"Other".equals(selectedPurpose)) {
                    application.setPurpose("Others");
                    application.setCustomPurpose(blankToNull(loan.customPurpose()) == null
                            ? selectedPurpose : blankToNull(loan.customPurpose()));
                } else {
                    application.setPurpose("Other".equals(selectedPurpose) ? "Others" : selectedPurpose);
                }
            }
            if (loan.customPurpose() != null && StringUtils.hasText(loan.customPurpose())) {
                application.setCustomPurpose(blankToNull(loan.customPurpose()));
            }
            if (loan.requiredAmount() != null) application.setRequiredAmount(decimal(loan.requiredAmount(), "requiredAmount"));
            if (loan.preferredTenureMonths() != null) application.setPreferredTenureMonths(integer(loan.preferredTenureMonths(), "preferredTenureMonths"));
            if (loan.employmentType() != null) application.setEmploymentType(blankToNull(loan.employmentType()));
            if (loan.hasExistingLoans() != null) application.setExistingCustomer(loan.hasExistingLoans());
            if (loan.existingEmi() != null) application.setExistingEmi(decimal(loan.existingEmi(), "existingEmi"));
            if (loan.monthlyIncomeOrTurnover() != null) application.setMonthlyIncomeOrTurnover(decimal(loan.monthlyIncomeOrTurnover(), "monthlyIncomeOrTurnover"));
            application.setPropertyStage(valueOrKeep(loan.propertyStage(), application.getPropertyStage()));
            if (loan.estimatedPropertyValue() != null) application.setEstimatedPropertyValue(decimal(loan.estimatedPropertyValue(), "estimatedPropertyValue"));
            application.setPropertyCity(valueOrKeep(loan.propertyCity(), application.getPropertyCity()));
        }
        if (request.applicantDetails() != null) {
            PropertyLoanApplicant target = application.getApplicant() == null
                    ? new PropertyLoanApplicant() : application.getApplicant();
            mapApplicant(request.applicantDetails(), target);
            application.setApplicant(target);
        }
        if (request.propertyDetails() != null) {
            PropertyLoanProperty target = application.getProperty() == null
                    ? new PropertyLoanProperty() : application.getProperty();
            mapProperty(request.propertyDetails(), target);
            application.setProperty(target);
        }
        if (request.ownershipDetails() != null) {
            PropertyLoanOwnership target = application.getOwnership() == null
                    ? new PropertyLoanOwnership() : application.getOwnership();
            mapOwnership(request.ownershipDetails(), target);
            application.setOwnership(target);
        }
        if (request.isConsentChecked() != null) application.setConfirmationChecked(request.isConsentChecked());
        else if (request.ownershipDetails() != null && request.ownershipDetails().isConfirmationChecked() != null) {
            application.setConfirmationChecked(request.ownershipDetails().isConfirmationChecked());
        }
    }

    private void mapApplicant(PropertyLoanRequest.ApplicantDetails source, PropertyLoanApplicant target) {
        if (source.fullName() != null) target.setFullName(blankToNull(source.fullName()));
        if (source.pan() != null) target.setPan(blankToNull(source.pan()).toUpperCase(Locale.ROOT));
        if (source.mobile() != null) target.setMobile(blankToNull(source.mobile()));
        if (source.dob() != null) target.setDob(parseDate(source.dob()));
        if (source.currentAddress() != null) target.setCurrentAddress(blankToNull(source.currentAddress()));
        if (source.gender() != null) target.setGender(blankToNull(source.gender()));
        if (source.maritalStatus() != null) target.setMaritalStatus(blankToNull(source.maritalStatus()));
        if (source.residenceType() != null) target.setResidenceType(blankToNull(source.residenceType()));
        if (source.yearsAtCurrentAddress() != null) target.setYearsAtCurrentAddress(blankToNull(source.yearsAtCurrentAddress()));
        if (source.employerCategory() != null) target.setEmployerCategory(blankToNull(source.employerCategory()));
        if (source.employerName() != null) target.setEmployerName(blankToNull(source.employerName()));
        if (source.totalWorkExperience() != null) target.setTotalWorkExperience(blankToNull(source.totalWorkExperience()));
        if (source.yearsInCurrentJob() != null) target.setYearsInCurrentJob(blankToNull(source.yearsInCurrentJob()));
        if (source.annualIncome() != null) target.setAnnualIncome(decimal(source.annualIncome(), "annualIncome"));
        if (source.hasExistingLoans() != null) target.setHasExistingLoans(source.hasExistingLoans());
    }

    private void mapProperty(PropertyLoanRequest.PropertyDetails source, PropertyLoanProperty target) {
        if (source.pincode() != null) target.setPincode(blankToNull(source.pincode()));
        if (source.city() != null) target.setCity(blankToNull(source.city()));
        if (source.district() != null) target.setDistrict(blankToNull(source.district()));
        if (source.state() != null) target.setState(blankToNull(source.state()));
        if (source.propertyAddress() != null) target.setPropertyAddress(blankToNull(source.propertyAddress()));
        if (source.landmark() != null) target.setLandmark(blankToNull(source.landmark()));
        if (source.propertyType() != null) target.setPropertyType(blankToNull(source.propertyType()));
        if (source.propertySubType() != null) target.setPropertySubType(blankToNull(source.propertySubType()));
        if (source.constructionStatus() != null) target.setConstructionStatus(blankToNull(source.constructionStatus()));
        if (source.currentUsage() != null) target.setCurrentUsage(blankToNull(source.currentUsage()));
        if (source.areaType() != null) target.setAreaType(blankToNull(source.areaType()));
        if (source.area() != null) target.setArea(decimal(source.area(), "area"));
        if (source.propertyAge() != null) target.setPropertyAge(blankToNull(source.propertyAge()));
        if (source.approvingAuthority() != null) target.setApprovingAuthority(blankToNull(source.approvingAuthority()));
        if (source.estimatedMarketValue() != null) target.setEstimatedMarketValue(decimal(source.estimatedMarketValue(), "estimatedMarketValue"));
    }

    private void mapOwnership(PropertyLoanRequest.OwnershipDetails source, PropertyLoanOwnership target) {
        if (source.ownershipType() != null) target.setOwnershipType(blankToNull(source.ownershipType()));
        if (source.coOwnerFullName() != null) target.setCoOwnerFullName(blankToNull(source.coOwnerFullName()));
        if (source.coOwnerRelationship() != null) target.setCoOwnerRelationship(blankToNull(source.coOwnerRelationship()));
        if (source.coOwnerPan() != null) target.setCoOwnerPan(blankToNull(source.coOwnerPan()).toUpperCase(Locale.ROOT));
        if (source.coOwnerMobile() != null) target.setCoOwnerMobile(blankToNull(source.coOwnerMobile()));
        if (source.currentLender() != null) target.setCurrentLender(blankToNull(source.currentLender()));
        if (source.existingLoanType() != null) target.setExistingLoanType(blankToNull(source.existingLoanType()));
        if (source.outstandingLoanAmount() != null) target.setOutstandingLoanAmount(decimal(source.outstandingLoanAmount(), "outstandingLoanAmount"));
        if (source.isConfirmationChecked() != null) target.setConfirmationChecked(source.isConfirmationChecked());
    }

    private void validateForSubmission(PropertyLoanApplication application) {
        requireText(application.getLoanType(), "loanType is required");
        requireText(application.getLoanTypeId(), "loanTypeId is required");
        requireText(application.getPurpose(), "loanDetails.purpose is required");
        if (!PURPOSES.contains(application.getPurpose())) invalid("loanDetails.purpose is not a supported Property Loan purpose");
        if ("Others".equals(application.getPurpose())) requireText(application.getCustomPurpose(), "loanDetails.customPurpose is required when purpose is Others");
        positive(application.getRequiredAmount(), "loanDetails.requiredAmount");
        if (application.getRequiredAmount().compareTo(new BigDecimal("10000")) < 0) invalid("loanDetails.requiredAmount must be at least 10000");
        if (application.getPreferredTenureMonths() == null || application.getPreferredTenureMonths() < 1 ||
                application.getPreferredTenureMonths() > 240) invalid("loanDetails.preferredTenureMonths must be between 1 and 240");
        requireText(application.getEmploymentType(), "loanDetails.employmentType is required");
        if (application.getExistingCustomer() == null) invalid("loanDetails.hasExistingLoans (existing customer selection) is required");
        positive(application.getMonthlyIncomeOrTurnover(), "loanDetails.monthlyIncomeOrTurnover");
        if (Boolean.TRUE.equals(application.getExistingCustomer())) positive(application.getExistingEmi(), "loanDetails.existingEmi");

        PropertyLoanApplicant applicant = application.getApplicant();
        if (applicant == null) invalid("applicantDetails are required");
        requireText(applicant.getFullName(), "applicantDetails.fullName is required");
        if (applicant.getPan() == null || !applicant.getPan().matches("^[A-Z]{5}[0-9]{4}[A-Z]$")) invalid("applicantDetails.pan must be a valid PAN");
        if (applicant.getMobile() == null || !applicant.getMobile().matches("^[6-9][0-9]{9}$")) invalid("applicantDetails.mobile must be a valid 10-digit Indian mobile number");
        if (applicant.getDob() == null || !applicant.getDob().isBefore(LocalDate.now())) invalid("applicantDetails.dob must be a past date");
        requireText(applicant.getCurrentAddress(), "applicantDetails.currentAddress is required");
        requireText(applicant.getGender(), "applicantDetails.gender is required");
        requireText(applicant.getMaritalStatus(), "applicantDetails.maritalStatus is required");
        requireText(applicant.getResidenceType(), "applicantDetails.residenceType is required");
        requireText(applicant.getYearsAtCurrentAddress(), "applicantDetails.yearsAtCurrentAddress is required");
        requireText(applicant.getEmployerCategory(), "applicantDetails.employerCategory is required");
        requireText(applicant.getEmployerName(), "applicantDetails.employerName is required");
        requireText(applicant.getTotalWorkExperience(), "applicantDetails.totalWorkExperience is required");
        requireText(applicant.getYearsInCurrentJob(), "applicantDetails.yearsInCurrentJob is required");
        positive(applicant.getAnnualIncome(), "applicantDetails.annualIncome");
        if (applicant.getHasExistingLoans() == null) invalid("applicantDetails.hasExistingLoans is required");

        PropertyLoanProperty property = application.getProperty();
        if (property == null) invalid("propertyDetails are required");
        if (property.getPincode() == null || !property.getPincode().matches("^[1-9][0-9]{5}$")) invalid("propertyDetails.pincode must be a valid 6-digit PIN code");
        requireText(property.getCity(), "propertyDetails.city is required");
        requireText(property.getDistrict(), "propertyDetails.district is required");
        requireText(property.getState(), "propertyDetails.state is required");
        requireText(property.getPropertyAddress(), "propertyDetails.propertyAddress is required");
        requireText(property.getPropertyType(), "propertyDetails.propertyType is required");
        requireText(property.getPropertySubType(), "propertyDetails.propertySubType is required");
        requireText(property.getConstructionStatus(), "propertyDetails.constructionStatus is required");
        requireText(property.getCurrentUsage(), "propertyDetails.currentUsage is required");
        requireText(property.getAreaType(), "propertyDetails.areaType is required");
        positive(property.getArea(), "propertyDetails.area");
        requireText(property.getPropertyAge(), "propertyDetails.propertyAge is required");
        requireText(property.getApprovingAuthority(), "propertyDetails.approvingAuthority is required");
        positive(property.getEstimatedMarketValue(), "propertyDetails.estimatedMarketValue");

        PropertyLoanOwnership ownership = application.getOwnership();
        if (ownership == null) invalid("ownershipDetails are required");
        requireText(ownership.getOwnershipType(), "ownershipDetails.ownershipType is required");
        if ("Joint Ownership".equalsIgnoreCase(ownership.getOwnershipType())) {
            requireText(ownership.getCoOwnerFullName(), "ownershipDetails.coOwnerFullName is required for joint ownership");
            requireText(ownership.getCoOwnerRelationship(), "ownershipDetails.coOwnerRelationship is required for joint ownership");
            if (!RELATIONSHIPS.contains(ownership.getCoOwnerRelationship())) invalid("ownershipDetails.coOwnerRelationship is not supported");
            if (ownership.getCoOwnerPan() == null || !ownership.getCoOwnerPan().matches("^[A-Z]{5}[0-9]{4}[A-Z]$")) invalid("ownershipDetails.coOwnerPan must be a valid PAN");
            if (ownership.getCoOwnerMobile() == null || !ownership.getCoOwnerMobile().matches("^[6-9][0-9]{9}$")) invalid("ownershipDetails.coOwnerMobile must be a valid 10-digit Indian mobile number");
        }
        if (Boolean.TRUE.equals(applicant.getHasExistingLoans())) {
            requireText(ownership.getCurrentLender(), "ownershipDetails.currentLender is required when applicant has existing loans");
            requireText(ownership.getExistingLoanType(), "ownershipDetails.existingLoanType is required when applicant has existing loans");
            positive(ownership.getOutstandingLoanAmount(), "ownershipDetails.outstandingLoanAmount");
        }
        if (!application.isConfirmationChecked() || !ownership.isConfirmationChecked()) invalid("Review and ownership confirmation are required");

        Set<String> uploadedTypes = documentRepository.findAllByApplication_IdOrderByUploadedAtDesc(application.getId())
                .stream().map(PropertyLoanDocument::getDocumentType).collect(java.util.stream.Collectors.toSet());
        List<String> missingDocuments = DOCUMENTS.entrySet().stream()
                .filter(entry -> entry.getValue().required() && !uploadedTypes.contains(entry.getKey()))
                .map(Map.Entry::getKey).toList();
        if (!missingDocuments.isEmpty()) invalid("Required document uploads are missing: " + String.join(", ", missingDocuments));
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) invalid("file is required and must not be empty");
        if (file.getSize() > 25L * 1024 * 1024) invalid("file must not exceed 25 MB");
        String contentType = file.getContentType();
        if (contentType == null || !Set.of("application/pdf", "image/jpeg", "image/png", "image/webp")
                .contains(contentType.toLowerCase(Locale.ROOT))) {
            invalid("Only PDF, JPEG, PNG, and WebP documents are allowed");
        }
    }

    private PropertyLoanApplication owned(Long id) {
        return applicationRepository.findByIdAndCustomer_CustId(id, currentCustomerId())
                .orElseThrow(() -> new PropertyLoanException(HttpStatus.NOT_FOUND, "Property Loan application not found"));
    }

    private String currentCustomerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtPrincipal principal)
                || !StringUtils.hasText(principal.custId())) {
            throw new PropertyLoanException(HttpStatus.UNAUTHORIZED, "Authenticated customer is required");
        }
        return principal.custId();
    }

    private PropertyLoanDocument findDocument(Long applicationId, Long documentId) {
        return documentRepository.findByIdAndApplication_Id(documentId, applicationId)
                .orElseThrow(() -> new PropertyLoanException(HttpStatus.NOT_FOUND, "Property Loan document not found"));
    }

    private PropertyLoanResponse toResponse(PropertyLoanApplication application) {
        List<PropertyLoanDocumentResponse> documents = documentRepository
                .findAllByApplication_IdOrderByUploadedAtDesc(application.getId()).stream()
                .map(this::toDocumentResponse).toList();
        PropertyLoanApplicant applicant = application.getApplicant();
        PropertyLoanProperty property = application.getProperty();
        PropertyLoanOwnership ownership = application.getOwnership();
        Customer customer = application.getCustomer();
        List<PropertyLoanResponse.TimelineEntry> timeline = new ArrayList<>();
        if (application.getStatus() != PropertyLoanStatus.DRAFT) {
            timeline.add(new PropertyLoanResponse.TimelineEntry(
                    PropertyLoanStatus.DRAFT, "Draft", "Application saved as draft.", application.getCreatedAt(), true, false));
        }
        timeline.add(new PropertyLoanResponse.TimelineEntry(
                application.getStatus(), timelineTitle(application.getStatus()), timelineDescription(application.getStatus()),
                application.getSubmittedAt() == null ? application.getUpdatedAt() : application.getSubmittedAt(), true, true));
        return new PropertyLoanResponse(
                String.valueOf(application.getId()), application.getApplicationNumber(), application.getLoanType(),
                application.getStatus(), application.getRequiredAmount(), application.getCreatedAt(), timeline,
                new PropertyLoanResponse.PropertyLoanDetails(application.getLoanType(), application.getPurpose(),
                        application.getCustomPurpose(), application.getRequiredAmount(), application.getPreferredTenureMonths(),
                        application.getEmploymentType(), application.getExistingCustomer(), application.getExistingEmi(),
                        application.getMonthlyIncomeOrTurnover(), application.getPropertyStage(),
                        application.getEstimatedPropertyValue(), application.getPropertyCity()),
                applicant == null ? null : applicantResponse(applicant),
                property == null ? null : propertyResponse(property),
                ownership == null ? null : ownershipResponse(ownership),
                new PropertyLoanResponse.CustomerProfile(customer.getName(), customer.getMobileNumber(), customer.getEmail(),
                        customer.getPan(), customer.getAadhaar(),
                        customer.getDob() == null ? null : customer.getDob().toString(),
                        StringUtils.hasText(customer.getAddress()) ? customer.getAddress()
                                : String.join(", ", nonEmpty(customer.getAddressLine1(), customer.getAddressLine2(), customer.getCity(), customer.getState(), customer.getPincode())),
                        customer.getCustomerType() == null ? null : customer.getCustomerType().name()),
                documents);
    }

    private PropertyLoanResponse.ApplicantDetails applicantResponse(PropertyLoanApplicant applicant) {
        return new PropertyLoanResponse.ApplicantDetails(applicant.getFullName(), applicant.getPan(), applicant.getMobile(),
                applicant.getDob() == null ? null : applicant.getDob().toString(), applicant.getCurrentAddress(),
                applicant.getGender(), applicant.getMaritalStatus(), applicant.getResidenceType(),
                applicant.getYearsAtCurrentAddress(), applicant.getEmployerCategory(), applicant.getEmployerName(),
                applicant.getTotalWorkExperience(), applicant.getYearsInCurrentJob(), applicant.getAnnualIncome(),
                applicant.getHasExistingLoans());
    }

    private PropertyLoanResponse.PropertyDetails propertyResponse(PropertyLoanProperty property) {
        return new PropertyLoanResponse.PropertyDetails(property.getPincode(), property.getCity(), property.getDistrict(),
                property.getState(), property.getPropertyAddress(), property.getLandmark(), property.getPropertyType(),
                property.getPropertySubType(), property.getConstructionStatus(), property.getCurrentUsage(),
                property.getAreaType(), property.getArea(), property.getPropertyAge(), property.getApprovingAuthority(),
                property.getEstimatedMarketValue());
    }

    private PropertyLoanResponse.OwnershipDetails ownershipResponse(PropertyLoanOwnership ownership) {
        return new PropertyLoanResponse.OwnershipDetails(ownership.getOwnershipType(), ownership.getCoOwnerFullName(),
                ownership.getCoOwnerRelationship(), ownership.getCoOwnerPan(), ownership.getCoOwnerMobile(),
                ownership.getCurrentLender(), ownership.getExistingLoanType(), ownership.getOutstandingLoanAmount(),
                ownership.isConfirmationChecked());
    }

    private PropertyLoanDocumentResponse toDocumentResponse(PropertyLoanDocument document) {
        return new PropertyLoanDocumentResponse(document.getId(), document.getDocumentType(), document.getDocumentName(),
                document.getFileName(), document.getFileSize(), document.getContentType(), document.isRequired(),
                document.getUploadedAt(), "/api/v1/property-loans/" + document.getApplication().getId()
                        + "/documents/" + document.getId() + "/content");
    }

    private String timelineTitle(PropertyLoanStatus status) {
        return switch (status) {
            case DRAFT -> "Draft";
            case SUBMITTED -> "Application Received";
            case UNDER_REVIEW -> "Under Review";
            case DOCUMENT_VERIFICATION -> "Document Verification";
            case VALUATION -> "Property Valuation";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
            case DISBURSED -> "Disbursed";
            case CANCELLED -> "Cancelled";
        };
    }

    private String timelineDescription(PropertyLoanStatus status) {
        return switch (status) {
            case DRAFT -> "Application saved as draft.";
            case SUBMITTED -> "Application submitted and received.";
            case UNDER_REVIEW -> "Application is under review.";
            case DOCUMENT_VERIFICATION -> "Submitted documents are being verified.";
            case VALUATION -> "Property valuation is in progress.";
            case APPROVED -> "Application has been approved.";
            case REJECTED -> "Application has been rejected.";
            case DISBURSED -> "Loan has been disbursed.";
            case CANCELLED -> "Application has been cancelled.";
        };
    }

    private BigDecimal decimal(String value, String field) {
        if (!StringUtils.hasText(value)) return null;
        try {
            BigDecimal parsed = new BigDecimal(value.trim().replace(",", ""));
            if (parsed.scale() > 2) throw new NumberFormatException();
            return parsed;
        } catch (NumberFormatException exception) {
            throw new PropertyLoanException(HttpStatus.BAD_REQUEST, field + " must be a valid number with at most two decimal places");
        }
    }

    private Integer integer(String value, String field) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException exception) {
            throw new PropertyLoanException(HttpStatus.BAD_REQUEST, field + " must be a whole number");
        }
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            try {
                return LocalDate.parse(value.trim(), DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            } catch (DateTimeParseException secondException) {
                throw new PropertyLoanException(HttpStatus.BAD_REQUEST, "dob must be a valid date");
            }
        }
    }

    private void positive(BigDecimal value, String field) {
        if (value == null || value.signum() <= 0) invalid(field + " must be greater than zero");
    }

    private void requireText(String value, String message) {
        if (!StringUtils.hasText(value)) invalid(message);
    }

    private void invalid(String message) {
        throw new PropertyLoanException(HttpStatus.BAD_REQUEST, message);
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String valueOrKeep(String value, String current) {
        return value == null ? current : blankToNull(value);
    }

    private String safeFileName(String originalName) {
        String filename = StringUtils.hasText(originalName) ? originalName : "document";
        String safe = filename.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        return safe.length() > 255 ? safe.substring(safe.length() - 255) : defaultText(safe, "document");
    }

    private List<String> nonEmpty(String... values) {
        return java.util.Arrays.stream(values).filter(StringUtils::hasText).toList();
    }

    private void deleteStoredFileAfterFailure(String path, Exception originalFailure) {
        if (!StringUtils.hasText(path)) return;
        try {
            fileStorage.delete(path);
        } catch (IOException cleanupFailure) {
            originalFailure.addSuppressed(cleanupFailure);
        }
    }

    private void scheduleFileCleanup(String newPath, String previousPath) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) deleteStoredFileQuietly(previousPath);
                else deleteStoredFileQuietly(newPath);
            }
        });
    }

    private void deleteStoredFileQuietly(String path) {
        if (!StringUtils.hasText(path)) return;
        try {
            fileStorage.delete(path);
        } catch (IOException exception) {
            log.warn("Unable to clean up Property Loan document file after transaction completion");
        }
    }

    private record DocumentDefinition(String name, boolean required) {}
}
