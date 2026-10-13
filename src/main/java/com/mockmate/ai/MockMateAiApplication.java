package com.mockmate.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class MockMateAiApplication {
    private static final Logger log = LoggerFactory.getLogger(MockMateAiApplication.class);

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(MockMateAiApplication.class, args);
    }

    private static void loadDotEnv() {
        try {
            File envFile = new File(".env");
            if (!envFile.exists()) {
                envFile = new File("../.env");
            }
            if (envFile.exists()) {
                List<String> lines = Files.readAllLines(envFile.toPath());
                for (String line : lines) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
                        continue;
                    }
                    int eq = line.indexOf('=');
                    String key = line.substring(0, eq).trim();
                    String val = line.substring(eq + 1).trim();
                    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length() - 1);
                    }
                    if (System.getProperty(key) == null && System.getenv(key) == null) {
                        System.setProperty(key, val);
                    }
                    if (key.equals("VITE_GROK_API_KEY") && System.getProperty("GROQ_API_KEY") == null && System.getenv("GROQ_API_KEY") == null) {
                        System.setProperty("GROQ_API_KEY", val);
                    }
                    if (key.equals("VITE_GEMINI_API_KEY") && System.getProperty("GEMINI_API_KEY") == null && System.getenv("GEMINI_API_KEY") == null) {
                        System.setProperty("GEMINI_API_KEY", val);
                    }
                }
                log.info("Successfully loaded environment variables from .env file into Spring Boot environment.");
            }
        } catch (Exception e) {
            log.warn("Could not load .env file: {}", e.getMessage());
        }
    }
}

