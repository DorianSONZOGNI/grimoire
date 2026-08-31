package generation.grimoire.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

@Configuration
public class JacksonConfig {

    /**
     * Registers the Hibernate6Module so Jackson handles lazy proxies gracefully:
     * - Uninitialized lazy associations serialize as null (no hibernateLazyInitializer crash)
     * - Initialized associations serialize normally
     */
    @Bean
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        Hibernate6Module hibernate6Module = new Hibernate6Module();
        // Serialize lazy, uninitialized proxies as null instead of throwing
        hibernate6Module.disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION);
        return builder.modulesToInstall(hibernate6Module).build();
    }
}
