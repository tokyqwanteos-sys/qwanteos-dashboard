// Google Sheets Sync pour SETUP QWANTEOS
class GoogleSheetsSync {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbya0Uq_S3eXCTF-rjJc_qmEH4Eb7sQ1sSeWrxspIJL4N0GT0cYfzhXnHkK4NBlWoZTwHw/exec';
        this.apiKey = 'SETUP_QWANTEOS_2024';
        this.isEnabled = false;
        this.syncInterval = null;
        this.initialize();
    }

    initialize() {
        // Vérifier si la sync est déjà activée
        const saved = localStorage.getItem('qwanteos_sync_enabled');
        this.isEnabled = saved === 'true';
        
        if (this.isEnabled) {
            this.startAutoSync();
        }
        
        this.updateUI();
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('qwanteos_sync_enabled', 'true');
        this.startAutoSync();
        this.updateUI();
        return true;
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('qwanteos_sync_enabled', 'false');
        this.stopAutoSync();
        this.updateUI();
        return true;
    }

    startAutoSync() {
        this.stopAutoSync();
        
        // Sync toutes les 30 secondes
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30000);
        
        // Première sync immédiate
        setTimeout(() => this.syncData(), 1000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncData() {
        if (!this.isEnabled || !window.dashboard) return;
        
        try {
            const data = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString()
            };

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: data,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showStatus('success', `Sync: ${new Date().toLocaleTimeString()}`);
                console.log('✅ Sync réussie');
            } else {
                this.showStatus('error', 'Erreur sync');
            }
        } catch (error) {
            console.error('❌ Erreur sync:', error);
            this.showStatus('error', 'Hors ligne');
        }
    }

    async syncNow() {
        if (!window.dashboard) return false;
        
        try {
            const data = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString()
            };

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: data,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showStatus('success', `Sync manuelle réussie: ${new Date().toLocaleTimeString()}`);
                return true;
            } else {
                this.showStatus('error', 'Erreur sync');
                return false;
            }
        } catch (error) {
            console.error('Erreur sync manuelle:', error);
            this.showStatus('error', 'Erreur réseau');
            return false;
        }
    }

    async loadFromSheets() {
        if (!window.dashboard) return false;
        
        try {
            const response = await fetch(`${this.scriptUrl}?action=getAll&apiKey=${this.apiKey}`);
            const data = await response.json();
            
            if (data.tasks && data.agents) {
                // Fusionner avec les données locales
                localStorage.setItem('qwanteos_tasks', JSON.stringify(data.tasks));
                localStorage.setItem('qwanteos_agents', JSON.stringify(data.agents));
                
                // Rafraîchir le dashboard
                window.dashboard.updateStatistics();
                window.dashboard.updateCharts();
                window.dashboard.loadAgentsToSelect();
                
                this.showStatus('success', 'Données chargées depuis Sheets');
                return true;
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            this.showStatus('error', 'Erreur chargement');
        }
        return false;
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            const icon = type === 'success' ? '✅' : '❌';
            statusElement.innerHTML = `<span style="color: ${type === 'success' ? '#27ae60' : '#e74c3c'}">${icon} ${message}</span>`;
        }
        
        const timeElement = document.getElementById('lastSyncTime');
        if (timeElement && type === 'success') {
            timeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    updateUI() {
        const modeElement = document.getElementById('syncMode');
        if (modeElement) {
            modeElement.textContent = this.isEnabled ? 'Activé' : 'Désactivé';
            modeElement.style.color = this.isEnabled ? '#27ae60' : '#e74c3c';
        }
    }
}

// Initialiser
window.googleSync = new GoogleSheetsSync();

// Fonctions globales pour les boutons
function enableCloudSync() {
    if (googleSync.enable()) {
        if (window.dashboard) {
            window.dashboard.showNotification('Synchronisation activée', 'success');
        }
    }
}

function disableCloudSync() {
    if (googleSync.disable()) {
        if (window.dashboard) {
            window.dashboard.showNotification('Synchronisation désactivée', 'warning');
        }
    }
}

function syncNow() {
    if (window.dashboard) {
        window.dashboard.showNotification('Synchronisation en cours...', 'info');
    }
    
    googleSync.syncNow().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Synchronisation terminée', 'success');
            } else {
                window.dashboard.showNotification('Erreur de synchronisation', 'error');
            }
        }
    });
}

function loadFromSheets() {
    if (window.dashboard) {
        window.dashboard.showNotification('Chargement depuis Google Sheets...', 'info');
    }
    
    googleSync.loadFromSheets().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Données chargées avec succès', 'success');
            } else {
                window.dashboard.showNotification('Erreur de chargement', 'error');
            }
        }
    });
}