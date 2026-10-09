package com.taxedge.propertyloan.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PropertyLoanFileStorage {
    private final Path root;

    public PropertyLoanFileStorage(
            @Value("${app.storage.property-loan-dir:./uploads/property-loans}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    public String store(Long applicationId, MultipartFile file) throws IOException {
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String safeExtension = extension == null || !extension.matches("[A-Za-z0-9]{1,10}")
                ? "" : "." + extension.toLowerCase(Locale.ROOT);
        String key = applicationId + "/" + UUID.randomUUID() + safeExtension;
        Path destination = resolveValidatedKey(key);
        Files.createDirectories(destination.getParent());
        try {
            file.transferTo(destination);
            long storedSize = Files.size(destination);
            if (!Files.isRegularFile(destination) || storedSize == 0 || storedSize != file.getSize()) {
                throw new IOException("Uploaded file was not stored successfully");
            }
            return key;
        } catch (IOException | RuntimeException exception) {
            Files.deleteIfExists(destination);
            throw exception;
        }
    }

    public Resource load(String key) throws IOException {
        Path path = resolveValidatedKey(key);
        if (!Files.isRegularFile(path)) throw new IOException("Stored document does not exist");
        return new FileSystemResource(path);
    }

    public void delete(String key) throws IOException {
        Files.deleteIfExists(resolveValidatedKey(key));
    }

    private Path resolveValidatedKey(String key) throws IOException {
        if (key == null || !key.matches("[0-9]+/[0-9a-fA-F-]{36}(?:\\.[A-Za-z0-9]{1,10})?")) {
            throw new IOException("Stored document path is invalid");
        }
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) throw new IOException("Stored document path is invalid");
        return path;
    }
}
