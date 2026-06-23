package generation.grimoire.enumeration;

public enum DetachedSoulRequirement {
    NOT_AFFECTED, // Always triggers
    REQUIRED,     // Only triggers if "âme détachée" is present
    FORBIDDEN     // Only triggers if "âme détachée" is NOT present
}
