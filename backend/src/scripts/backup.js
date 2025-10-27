const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../middleware/errorHandler');

const execAsync = promisify(exec);

class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;
    this.mongoUri = process.env.MONGO_URI;
  }

  // Ensure backup directory exists
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('Created backup directory', { dir: this.backupDir });
    }
  }

  // Create database backup
  async createBackup() {
    try {
      this.ensureBackupDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `cranefleet-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      logger.info('Starting database backup', { 
        backupName, 
        timestamp: new Date().toISOString() 
      });

      // Create backup using mongodump
      const command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('done dumping')) {
        throw new Error(`Backup failed: ${stderr}`);
      }

      // Compress backup
      const compressedPath = `${backupPath}.tar.gz`;
      const compressCommand = `tar -czf "${compressedPath}" -C "${this.backupDir}" "${backupName}"`;
      await execAsync(compressCommand);

      // Remove uncompressed directory
      await execAsync(`rm -rf "${backupPath}"`);

      const stats = fs.statSync(compressedPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      logger.info('Database backup completed', {
        backupName,
        compressedPath,
        sizeMB,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        backupName,
        path: compressedPath,
        sizeMB,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Database backup failed', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Restore database from backup
  async restoreBackup(backupPath) {
    try {
      logger.info('Starting database restore', { 
        backupPath,
        timestamp: new Date().toISOString() 
      });

      // Extract backup if compressed
      let extractedPath = backupPath;
      if (backupPath.endsWith('.tar.gz')) {
        const extractDir = path.dirname(backupPath);
        const extractCommand = `tar -xzf "${backupPath}" -C "${extractDir}"`;
        await execAsync(extractCommand);
        
        // Find the extracted directory
        const files = fs.readdirSync(extractDir);
        const extractedDir = files.find(file => 
          file.startsWith('cranefleet-backup-') && 
          !file.endsWith('.tar.gz')
        );
        extractedPath = path.join(extractDir, extractedDir);
      }

      // Restore using mongorestore
      const command = `mongorestore --uri="${this.mongoUri}" --drop "${extractedPath}"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('done')) {
        throw new Error(`Restore failed: ${stderr}`);
      }

      logger.info('Database restore completed', {
        backupPath,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Database restored successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Database restore failed', {
        error: error.message,
        stack: error.stack,
        backupPath,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // List available backups
  async listBackups() {
    try {
      this.ensureBackupDir();
      
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return {
        success: true,
        backups,
        count: backups.length
      };

    } catch (error) {
      logger.error('Failed to list backups', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
  }

  // Clean old backups
  async cleanOldBackups() {
    try {
      const { backups } = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const oldBackups = backups.filter(backup => 
        backup.createdAt < cutoffDate
      );

      let deletedCount = 0;
      for (const backup of oldBackups) {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
          logger.info('Deleted old backup', { 
            name: backup.name,
            createdAt: backup.createdAt 
          });
        } catch (error) {
          logger.error('Failed to delete backup', {
            name: backup.name,
            error: error.message
          });
        }
      }

      logger.info('Backup cleanup completed', {
        deletedCount,
        retentionDays: this.retentionDays
      });

      return {
        success: true,
        deletedCount,
        retentionDays: this.retentionDays
      };

    } catch (error) {
      logger.error('Backup cleanup failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Schedule automatic backups
  scheduleBackups() {
    const intervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    logger.info('Scheduling automatic backups', {
      intervalHours,
      retentionDays: this.retentionDays
    });

    // Initial backup
    setTimeout(() => this.createBackup(), 5000);

    // Recurring backups
    setInterval(async () => {
      await this.createBackup();
      await this.cleanOldBackups();
    }, intervalMs);
  }
}

// CLI usage
if (require.main === module) {
  const backup = new DatabaseBackup();
  const command = process.argv[2];

  switch (command) {
    case 'create':
      backup.createBackup().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      });
      break;
    
    case 'list':
      backup.listBackups().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      });
      break;
    
    case 'clean':
      backup.cleanOldBackups().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      });
      break;
    
    case 'schedule':
      backup.scheduleBackups();
      break;
    
    default:
      console.log('Usage: node backup.js [create|list|clean|schedule]');
      process.exit(1);
  }
}

module.exports = DatabaseBackup;
