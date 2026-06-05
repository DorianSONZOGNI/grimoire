package generation.grimoire.controller.auth;

import generation.grimoire.entity.auth.AppUser;
import generation.grimoire.repository.auth.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        if (userRepository.existsByUsername(loginRequest.getUsername())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Ce nom d'utilisateur est déjà pris."));
        }

        AppUser user = new AppUser();
        user.setUsername(loginRequest.getUsername());
        user.setPassword(passwordEncoder.encode(loginRequest.getPassword()));
        user.setRole("USER");
        userRepository.save(user);

        // Auto-login after register
        authenticateUser(loginRequest.getUsername(), loginRequest.getPassword(), request, response);

        return ResponseEntity.ok(Map.of("message", "Compte créé avec succès !"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        try {
            authenticateUser(loginRequest.getUsername(), loginRequest.getPassword(), request, response);
            return ResponseEntity.ok(Map.of("message", "Connexion réussie !"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Identifiants invalides."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Non connecté."));
        }

        Map<String, Object> res = new HashMap<>();
        res.put("username", auth.getName());
        res.put("roles", auth.getAuthorities());
        
        userRepository.findByUsername(auth.getName()).ifPresent(u -> {
            res.put("id", u.getId());
            res.put("monnaie", u.getMonnaie());
        });

        return ResponseEntity.ok(res);
    }

    private void authenticateUser(String username, String password, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        
        // Force session creation so JSESSIONID is sent back
        request.getSession(true);
        
        securityContextRepository.saveContext(context, request, response);
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }
}
