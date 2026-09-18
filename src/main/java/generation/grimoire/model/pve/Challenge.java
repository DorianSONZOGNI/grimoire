package generation.grimoire.model.pve;

public class Challenge {
    private String type; // MAX_HEROES, MAX_HP_LOSS_PCT, MIN_HP_LOSS_PCT
    private int value;
    private String rewardType; // BONUS_SPIRIT_XP, BONUS_GOLD, REGEN_HP_MANA, EXTRA_LOOT
    private int rewardValue;
    private boolean failed = false;

    // Getters and Setters
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public int getValue() { return value; }
    public void setValue(int value) { this.value = value; }
    public String getRewardType() { return rewardType; }
    public void setRewardType(String rewardType) { this.rewardType = rewardType; }
    public int getRewardValue() { return rewardValue; }
    public void setRewardValue(int rewardValue) { this.rewardValue = rewardValue; }
    public boolean isFailed() { return failed; }
    public void setFailed(boolean failed) { this.failed = failed; }
}
