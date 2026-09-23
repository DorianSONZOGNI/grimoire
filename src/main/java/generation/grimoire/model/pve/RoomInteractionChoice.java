package generation.grimoire.model.pve;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomInteractionChoice {
    private String actionType; // OPEN, KEY, PASS, SACRIFICE, ROPE, ACCEPT
    private Long itemId; // for key or anomaly
}
