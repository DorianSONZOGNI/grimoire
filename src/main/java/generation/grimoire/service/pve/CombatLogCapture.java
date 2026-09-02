package generation.grimoire.service.pve;

import generation.grimoire.model.pve.CombatSession;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

/**
 * Utilitaire partagé pour capturer les logs System.out
 * émis par la logique de combat et les injecter dans le CombatLog de la session.
 */
class CombatLogCapture {

    @FunctionalInterface
    interface ActionBlock {
        void execute();
    }

    static void captureLogs(CombatSession session, ActionBlock block) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream originalOut = System.out;
        try {
            PrintStream ps = new PrintStream(baos, true, StandardCharsets.UTF_8);
            System.setOut(ps);
            block.execute();
            ps.flush();
        } catch (Exception e) {
            session.addLog("❌ Erreur interne : " + e.getMessage());
        } finally {
            System.setOut(originalOut);
        }

        String capturedLogs = baos.toString(StandardCharsets.UTF_8);
        for (String line : capturedLogs.split("\n")) {
            if (!line.trim().isEmpty()) {
                session.addLog(line.trim());
            }
        }
    }
}
