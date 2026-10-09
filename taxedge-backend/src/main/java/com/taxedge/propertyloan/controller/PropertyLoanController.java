package com.taxedge.propertyloan.controller;

import com.taxedge.propertyloan.dto.PropertyLoanDocumentResponse;
import com.taxedge.propertyloan.dto.PropertyLoanRequest;
import com.taxedge.propertyloan.dto.PropertyLoanResponse;
import com.taxedge.propertyloan.service.PropertyLoanService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/property-loans")
@RequiredArgsConstructor
public class PropertyLoanController {
    private final PropertyLoanService service;

    @PostMapping
    public ResponseEntity<PropertyLoanResponse> create(@Valid @RequestBody PropertyLoanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public PropertyLoanResponse update(@PathVariable Long id, @Valid @RequestBody PropertyLoanRequest request) {
        return service.update(id, request);
    }

    @GetMapping("/my")
    public List<PropertyLoanResponse> mine() {
        return service.mine();
    }

    @GetMapping("/{id}")
    public PropertyLoanResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/{id}/submit")
    public PropertyLoanResponse submit(@PathVariable Long id) {
        return service.submit(id);
    }

    @GetMapping("/{id}/status")
    public PropertyLoanResponse status(@PathVariable Long id) {
        return service.status(id);
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<PropertyLoanDocumentResponse> uploadDocument(
            @PathVariable Long id,
            @RequestParam String documentType,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.uploadDocument(id, documentType, file));
    }

    @GetMapping("/{id}/documents")
    public List<PropertyLoanDocumentResponse> documents(@PathVariable Long id) {
        return service.documents(id);
    }

    @GetMapping("/{id}/documents/{documentId}")
    public PropertyLoanDocumentResponse document(@PathVariable Long id, @PathVariable Long documentId) {
        return service.document(id, documentId);
    }

    @GetMapping("/{id}/documents/{documentId}/content")
    public ResponseEntity<Resource> documentContent(@PathVariable Long id, @PathVariable Long documentId) throws IOException {
        PropertyLoanDocumentResponse metadata = service.document(id, documentId);
        Resource file = service.documentContent(id, documentId);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(metadata.contentType());
        } catch (IllegalArgumentException ignored) {
            // The database content type is untrusted metadata; use the safe binary default.
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(metadata.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(file);
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id, @PathVariable Long documentId) {
        service.deleteDocument(id, documentId);
        return ResponseEntity.noContent().build();
    }
}
