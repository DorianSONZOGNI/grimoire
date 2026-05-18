package generation.grimoire.entity.personnage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ActiveShield {
    private int amount;
    private int duration;
    private String sourceName;
}
