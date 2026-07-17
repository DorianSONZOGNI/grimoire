package generation.grimoire;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class GrimoireApplication {

	public static void main(String[] args) {
		SpringApplication.run(GrimoireApplication.class, args);
	}

}
