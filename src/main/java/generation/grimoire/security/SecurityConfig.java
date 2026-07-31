package generation.grimoire.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Permet l'utilisation de @PreAuthorize sur les contrôleurs
public class SecurityConfig {

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/sons/**");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF désactivé : API REST stateless consommée exclusivement par du JS same-origin.
            // Le navigateur envoie le cookie JSESSIONID automatiquement ; pas de token CSRF nécessaire
            // tant que l'API n'est pas consommée par des clients tiers.
            // À terme, envisager un header custom X-Requested-With vérifié côté serveur.
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // --- Public : statiques + auth ---
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/meta/**").permitAll()
                .requestMatchers("/js/**", "/styles/**", "/images/**", "/sons/**", "/favicon.ico", "/favicon.svg", "/*.html", "/").permitAll()

                // --- Admin uniquement : CRUD entités de jeu ---
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/spells-editor").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/spells-editor/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/equipments").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/shop/templates/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/shop/templates/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/shop/templates/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/anomalies").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/anomalies/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/alchemy/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/alchemy/admin/**").hasRole("ADMIN")

                // --- Lecture publique (GET sur les API de consultation) ---
                .requestMatchers(HttpMethod.GET, "/api/**").permitAll()

                // --- Tout le reste nécessite une authentification ---
                .anyRequest().authenticated()
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
