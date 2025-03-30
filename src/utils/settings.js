const fs = require("fs").promises;
const path = require("path");
const { logger } = require("./logger");

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(__dirname, "../../config/settings.json");
    this.backupPath = path.join(__dirname, "../../config/backups");
    this.defaultSettings = {
      trading: {
        leverage: 1,
        positionSize: 100,
        stopLossPercent: 2,
        takeProfitPercent: 4,
        maxOpenPositions: 5,
      },
      pairs: {
        selected: [],
        excluded: [],
      },
      indicators: {
        rsi: {
          period: 11,
          overbought: 70,
          oversold: 30,
        },
      },
      notifications: {
        enabled: true,
        email: "",
        telegram: "",
      },
    };
  }

  async initialize() {
    try {
      // Create config directory if it doesn't exist
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });

      // Create backups directory if it doesn't exist
      await fs.mkdir(this.backupPath, { recursive: true });

      // Load or create settings file
      try {
        await fs.access(this.settingsPath);
      } catch {
        await this.saveSettings(this.defaultSettings);
      }
    } catch (error) {
      logger.error("Error initializing settings:", error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error("Error loading settings:", error);
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        "utf8"
      );
      logger.info("Settings saved successfully");
    } catch (error) {
      logger.error("Error saving settings:", error);
      throw error;
    }
  }

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings = {
        ...currentSettings,
        ...newSettings,
      };
      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      logger.error("Error updating settings:", error);
      throw error;
    }
  }

  async backupSettings() {
    try {
      const settings = await this.loadSettings();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        this.backupPath,
        `settings_backup_${timestamp}.json`
      );

      await fs.writeFile(backupFile, JSON.stringify(settings, null, 2), "utf8");
      logger.info(`Settings backed up to ${backupFile}`);
      return backupFile;
    } catch (error) {
      logger.error("Error backing up settings:", error);
      throw error;
    }
  }

  async restoreSettings(backupFile) {
    try {
      const data = await fs.readFile(backupFile, "utf8");
      const settings = JSON.parse(data);
      await this.saveSettings(settings);
      logger.info("Settings restored successfully");
      return settings;
    } catch (error) {
      logger.error("Error restoring settings:", error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      return files
        .filter((file) => file.startsWith("settings_backup_"))
        .map((file) => ({
          name: file,
          path: path.join(this.backupPath, file),
          timestamp: file.replace("settings_backup_", "").replace(".json", ""),
        }));
    } catch (error) {
      logger.error("Error listing backups:", error);
      throw error;
    }
  }

  async deleteBackup(backupFile) {
    try {
      await fs.unlink(backupFile);
      logger.info(`Backup deleted: ${backupFile}`);
    } catch (error) {
      logger.error("Error deleting backup:", error);
      throw error;
    }
  }

  async cleanupOldBackups(maxBackups = 10) {
    try {
      const backups = await this.listBackups();
      if (backups.length > maxBackups) {
        const sortedBackups = backups.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        const backupsToDelete = sortedBackups.slice(maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.path);
        }

        logger.info(`Cleaned up ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      logger.error("Error cleaning up old backups:", error);
      throw error;
    }
  }
}

module.exports = new SettingsManager();
