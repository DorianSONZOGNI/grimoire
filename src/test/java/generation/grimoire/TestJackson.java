package generation.grimoire;

import com.fasterxml.jackson.databind.ObjectMapper;
import generation.grimoire.enumeration.EquipmentSlot;

public class TestJackson {
    public static void main(String[] args) throws Exception {
        System.out.println(new ObjectMapper().writeValueAsString(EquipmentSlot.CASQUE));
    }
}
