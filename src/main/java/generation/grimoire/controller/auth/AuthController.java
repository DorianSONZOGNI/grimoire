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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import generation.grimoire.security.JwtService;
import generation.grimoire.security.RefreshTokenService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest loginRequest, HttpServletRequest request,
            HttpServletResponse response) {
        if (userRepository.existsByUsername(loginRequest.getUsername())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Ce nom d'utilisateur est déjà pris."));
        }

        AppUser user = new AppUser();
        user.setUsername(loginRequest.getUsername());
        user.setPassword(passwordEncoder.encode(loginRequest.getPassword()));
        user.setRole("USER");
        userRepository.save(user);

        // Auto-login after register
        return authenticateAndGenerateTokens(loginRequest.getUsername(), loginRequest.getPassword());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request,
            HttpServletResponse response) {
        try {
            return authenticateAndGenerateTokens(loginRequest.getUsername(), loginRequest.getPassword());
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
            res.put("unlockedSecrets", u.getUnlockedSecrets());
            res.put("unlockedDungeons", u.getUnlockedDungeons());
            res.put("unlockedVault", u.isUnlockedVault());
            res.put("unlockedAlchemy", u.isUnlockedAlchemy());
            res.put("unlockedShop", u.isUnlockedShop());
        });

        return ResponseEntity.ok(res);
    }

    @PostMapping("/unlock/{feature}")
    public ResponseEntity<?> unlockFeature(@PathVariable String feature) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Non connecté."));
        }

        AppUser user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if ("vault".equals(feature)) {
            if (user.isUnlockedVault())
                return ResponseEntity.ok(Map.of("message", "Déjà débloqué."));
            if (user.getMonnaie() < 50)
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Pas assez d'or."));
            user.setMonnaie(user.getMonnaie() - 50);
            user.setUnlockedVault(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Coffres débloqués avec succès !"));
        } else if ("alchemy".equals(feature)) {
            if (user.isUnlockedAlchemy())
                return ResponseEntity.ok(Map.of("message", "Déjà débloqué."));
            if (user.getMonnaie() < 150)
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Pas assez d'or."));
            user.setMonnaie(user.getMonnaie() - 150);
            user.setUnlockedAlchemy(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Alchimie débloquée avec succès !"));
        } else if ("shop".equals(feature)) {
            if (user.isUnlockedShop())
                return ResponseEntity.ok(Map.of("message", "Déjà débloqué."));
            if (user.getMonnaie() < 75)
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Pas assez d'or."));
            user.setMonnaie(user.getMonnaie() - 75);
            user.setUnlockedShop(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Boutique débloquée avec succès !"));
        } else if ("roster".equals(feature)) {
            int currentMax = user.getMaxCharacters();
            if (currentMax < 2)
                currentMax = 2;

            if (currentMax >= 8)
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Taille maximale déjà atteinte."));

            int[] upgradeCosts = { 0, 0, 20, 50, 75, 150, 200, 300 };
            int cost = upgradeCosts[currentMax];

            if (user.getMonnaie() < cost)
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Pas assez d'or."));
            user.setMonnaie(user.getMonnaie() - cost);
            user.setMaxCharacters(currentMax + 1);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Emplacement supplémentaire acheté avec succès !"));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Fonctionnalité inconnue."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        String refreshToken = getCookieValue(request, "refresh_token");
        if (refreshToken != null) {
            return refreshTokenService.findByToken(refreshToken)
                    .map(refreshTokenService::verifyExpiration)
                    .map(token -> token.getUser())
                    .map(user -> {
                        String token = jwtService.generateAccessToken(user.getUsername());
                        return ResponseEntity.ok(Map.of("token", token));
                    })
                    .orElseThrow(() -> new RuntimeException("Refresh token not found"));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie
                .from("refresh_token", "")
                .httpOnly(true)
                .secure(false) // Mettre à true en HTTPS
                .path("/api/auth/refresh")
                .maxAge(0)
                .build();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("message", "Déconnecté"));
    }

    private String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if (cookie.getName().equals(name)) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private ResponseEntity<?> authenticateAndGenerateTokens(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = jwtService.generateAccessToken(username);
        AppUser user = userRepository.findByUsername(username).orElseThrow();

        generation.grimoire.entity.auth.RefreshToken refreshToken = refreshTokenService
                .createRefreshToken(Objects.requireNonNull(user.getId()));

        org.springframework.http.ResponseCookie refreshCookie = org.springframework.http.ResponseCookie
                .from("refresh_token", Objects.requireNonNull(refreshToken.getToken()))
                .httpOnly(true)
                .secure(false) // Mettre à true en production HTTPS
                .path("/api/auth/refresh")
                .maxAge(7 * 24 * 60 * 60)
                .build();

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(Map.of("message", "Connexion réussie !", "token", jwt));
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }
}
