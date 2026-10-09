package com.taxedge.propertyloan.service;

import com.taxedge.propertyloan.dto.PropertyLoanDocumentResponse;
import com.taxedge.propertyloan.dto.PropertyLoanRequest;
import com.taxedge.propertyloan.dto.PropertyLoanResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface PropertyLoanService {
    PropertyLoanResponse create(PropertyLoanRequest request);
    PropertyLoanResponse update(Long id, PropertyLoanRequest request);
    List<PropertyLoanResponse> mine();
    PropertyLoanResponse get(Long id);
    PropertyLoanResponse submit(Long id);
    PropertyLoanResponse status(Long id);
    List<PropertyLoanDocumentResponse> documents(Long id);
    PropertyLoanDocumentResponse document(Long id, Long documentId);
    PropertyLoanDocumentResponse uploadDocument(Long id, String documentType, MultipartFile file);
    Resource documentContent(Long id, Long documentId) throws IOException;
    void deleteDocument(Long id, Long documentId);
}
