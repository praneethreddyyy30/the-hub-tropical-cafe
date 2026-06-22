package com.smartcafe.backend.controller;

import com.smartcafe.backend.entity.SystemSetting;
import com.smartcafe.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemSettingController {

    private final SystemSettingRepository settingRepository;

    // Public API: Retrieve public settings for client EmailJS dispatch
    @GetMapping("/settings/public")
    public ResponseEntity<Map<String, String>> getPublicSettings() {
        List<SystemSetting> settings = settingRepository.findAll();
        Map<String, String> publicMap = new HashMap<>();
        
        // Expose EmailJS configuration values and admin email
        for (SystemSetting setting : settings) {
            String key = setting.getKey();
            if (key.equals("emailjs_service_id") || 
                key.equals("emailjs_template_id") || 
                key.equals("emailjs_public_key") || 
                key.equals("admin_email")) {
                publicMap.put(key, setting.getValue());
            }
        }
        return ResponseEntity.ok(publicMap);
    }

    // Admin API: Get all system configurations
    @GetMapping("/admin/settings")
    public ResponseEntity<Map<String, String>> getAdminSettings() {
        List<SystemSetting> settings = settingRepository.findAll();
        Map<String, String> settingsMap = new HashMap<>();
        for (SystemSetting setting : settings) {
            settingsMap.put(setting.getKey(), setting.getValue());
        }
        return ResponseEntity.ok(settingsMap);
    }

    // Admin API: Save system configurations
    @PutMapping("/admin/settings")
    public ResponseEntity<Map<String, String>> updateAdminSettings(@RequestBody Map<String, String> newSettings) {
        for (Map.Entry<String, String> entry : newSettings.entrySet()) {
            SystemSetting setting = settingRepository.findById(entry.getKey())
                    .orElse(new SystemSetting(entry.getKey(), ""));
            setting.setValue(entry.getValue() != null ? entry.getValue() : "");
            settingRepository.save(setting);
        }
        
        // Return updated map
        return getAdminSettings();
    }
}
