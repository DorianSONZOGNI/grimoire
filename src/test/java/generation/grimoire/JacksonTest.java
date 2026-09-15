package generation.grimoire;
import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.model.pve.CombatSession;
import generation.grimoire.entity.pve.Donjon;
import generation.grimoire.entity.pve.Salle;
import generation.grimoire.enumeration.RoomType;
import java.util.*;

public class JacksonTest {
    public static void main(String[] args) throws Exception {
        Donjon d = new Donjon();
        Salle s = new Salle();
        s.setType(RoomType.COMBAT);
        d.setSalles(Arrays.asList(s));
        
        CombatSession cs = new CombatSession("test-id", d, new ArrayList<>());
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(cs);
        if (json.contains("salles")) {
            System.out.println("YES SALLES IS SERIALIZED");
        } else {
            System.out.println("NO SALLES");
            System.out.println(json);
        }
    }
}
