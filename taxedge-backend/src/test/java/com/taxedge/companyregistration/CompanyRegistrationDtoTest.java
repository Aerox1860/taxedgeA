package com.taxedge.companyregistration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.taxedge.companyregistration.dto.CompanyRegistrationDto;
import com.taxedge.companyregistration.dto.request.CreateCompanyRegistrationRequest;
import org.junit.jupiter.api.Test;

class CompanyRegistrationDtoTest {
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void readsFrontendDraftShape() throws Exception {
        String json = """
                {
                  "id": "INC-2026-89421",
                  "company": {
                    "companyType": "Private Limited",
                    "primaryActivity": "Software Services",
                    "nicCode": "62011",
                    "proposedName1": "TaxEdge Tech Private Limited",
                    "proposedName2": "TaxEdge Financial Innovations Pvt Ltd",
                    "registeredAddressLine": "Plot 42",
                    "registeredCity": "Hyderabad",
                    "registeredState": "Telangana",
                    "registeredPincode": "500081",
                    "companyEmail": "contact@example.com",
                    "companyMobile": "9876543210",
                    "authorizedCapital": 100000,
                    "paidUpCapital": 100000,
                    "numberOfShares": 10000,
                    "faceValuePerShare": 10
                  },
                  "directors": [{
                    "id": "dir-1",
                    "name": "Rajesh Kumar",
                    "pan": "ABCDE1234F",
                    "email": "rajesh@example.com",
                    "numberOfShares": 10000
                  }],
                  "partners": [],
                  "documents": [],
                  "currentStep": 8,
                  "paymentStatus": "Pending",
                  "status": "Draft"
                }
                """;

        CompanyRegistrationDto.DraftRequest request = objectMapper.readValue(json, CompanyRegistrationDto.DraftRequest.class);

        assertThat(request.id()).isEqualTo("INC-2026-89421");
        assertThat(request.company().proposedName1()).isEqualTo("TaxEdge Tech Private Limited");
        assertThat(request.directors()).hasSize(1);
        assertThat(request.directors().get(0).numberOfShares()).isEqualTo(10000);
        assertThat(request.currentStep()).isEqualTo(8);
    }

      @Test
      void readsConstitutionTypeAndNumericPersonId() throws Exception {
        String json = """
            {
              "companyType": "Private Limited",
              "constitutionType": "PRIVATE_LIMITED_COMPANY",
              "persons": [{ "id": 42, "personType": "DIRECTOR" }]
            }
            """;

        CreateCompanyRegistrationRequest request = objectMapper.readValue(json, CreateCompanyRegistrationRequest.class);

        assertThat(request.constitutionType()).isEqualTo("PRIVATE_LIMITED_COMPANY");
        assertThat(request.persons().get(0).id()).isEqualTo(42L);
      }
}