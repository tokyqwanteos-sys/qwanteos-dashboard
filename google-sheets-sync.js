// Google Sheets Sync pour SETUP QWANTEOS - Version Multi-Dashboards
class GoogleSheetsSync {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbzNiGC18yYn-jzp4Qd8cmSMiCDuptYZlpdSoQIgy8okOvvi6ZWKfuM5EW4pbrexc030zg/exec';
        this.apiKey = 'SETUP_QWANTEOS_2024';
        this.isEnabled = false;
        this.syncInterval = null;
        this.dashboardId = this.generateDashboardId();
        
        this.initialize();
    }

    generateDashboardId() {
        let id = localStorage.getItem('qwanteos_dashboard_id');
        if (!id) {
            // Créer un ID unique basé sur l'heure + random
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 6);
            id = `DASH_${timestamp}_${random}`;
            localStorage.setItem('qwanteos_dashboard_id', id);
        }
        return id;
    }

    initialize() {
        // Vérifier l'état sauvegardé
        const savedState = localStorage.getItem('qwanteos_sync_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.isEnabled = state.enabled || false;
        }
        
        // Tester la connexion
        this.testConnection().then(connected => {
            if (connected) {
                console.log('✅ Connecté à Google Sheets');
                if (this.isEnabled) {
                    this.startAutoSync();
                }
            } else {
                console.warn('⚠️ Impossible de se connecter à Google Sheets');
            }
        });
        
        this.updateUI();
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.scriptUrl}?action=ping&apiKey=${this.apiKey}`);
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Test connexion échoué:', error);
            return false;
        }
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('qwanteos_sync_state', JSON.stringify({
            enabled: true,
            dashboardId: this.dashboardId,
            lastEnable: new Date().toISOString()
        }));
        
        this.startAutoSync();
        this.updateUI();
        
        // Tester la connexion avant d'activer
        this.testConnection().then(connected => {
            if (connected) {
                this.showNotification('Synchronisation activée avec succès', 'success');
                // Premier sync immédiat
                setTimeout(() => this.syncNow(), 1000);
            } else {
                this.showNotification('Impossible de se connecter à Google Sheets', 'error');
                this.isEnabled = false;
                this.updateUI();
            }
        });
        
        return true;
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('qwanteos_sync_state', JSON.stringify({
            enabled: false,
            dashboardId: this.dashboardId,
            lastDisable: new Date().toISOString()
        }));
        
        this.stopAutoSync();
        this.updateUI();
        this.showNotification('Synchronisation désactivée', 'warning');
        return true;
    }

    startAutoSync() {
        this.stopAutoSync();
        
        // Sync toutes les 2 minutes (120 secondes) pour éviter les conflits
        this.syncInterval = setInterval(() => {
            this.performSafeSync();
        }, 120000); // 2 minutes
        
        console.log('🔄 Auto-sync démarré (toutes les 2 minutes)');
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏸️ Auto-sync arrêté');
        }
    }

    async performSafeSync() {
        if (!this.isEnabled || !window.dashboard) {
            return;
        }
        
        try {
            // Préparer les données
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString(),
                dashboardId: this.dashboardId
            };
            
            // Envoyer au serveur
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: allData,
                    apiKey: this.apiKey
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateStatus('success', 
                    `Sync auto: +${result.stats?.addedTasks || 0} tâches, +${result.stats?.addedAgents || 0} agents`);
                
                // Mettre à jour le timestamp
                localStorage.setItem('qwanteos_last_sync', new Date().toISOString());
                
            } else {
                this.updateStatus('error', `Erreur: ${result.error || 'Inconnue'}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur sync auto:', error);
            this.updateStatus('error', 'Hors ligne');
        }
    }

    async syncNow() {
        if (!window.dashboard) {
            this.showNotification('Dashboard non chargé', 'error');
            return false;
        }
        
        this.showNotification('Synchronisation manuelle en cours...', 'info');
        
        try {
            // Préparer les données
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString(),
                dashboardId: this.dashboardId
            };
            
            // Envoyer au serveur
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: allData,
                    apiKey: this.apiKey
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const addedTasks = result.stats?.addedTasks || 0;
                const addedAgents = result.stats?.addedAgents || 0;
                
                this.showNotification(
                    `Sync réussie! Ajouté: ${addedTasks} tâches, ${addedAgents} agents`,
                    'success'
                );
                
                this.updateStatus('success', 
                    `Dernière sync: ${new Date().toLocaleTimeString()} (+${addedTasks} tâches, +${addedAgents} agents)`);
                
                // Sauvegarder le timestamp
                localStorage.setItem('qwanteos_last_sync', new Date().toISOString());
                
                return true;
                
            } else {
                this.showNotification(`Erreur sync: ${result.error || 'Inconnue'}`, 'error');
                this.updateStatus('error', `Erreur: ${result.error || 'Inconnue'}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erreur sync manuelle:', error);
            this.showNotification('Erreur réseau lors de la synchronisation', 'error');
            this.updateStatus('error', 'Erreur réseau');
            return false;
        }
    }

    async loadFromSheets() {
        this.showNotification('Chargement depuis Google Sheets...', 'info');
        
        try {
            const response = await fetch(`${this.scriptUrl}?action=getAll&apiKey=${this.apiKey}`);
            const result = await response.json();
            
            if (result.success && window.dashboard) {
                // Fusion intelligente sans écrasement
                const localTasks = window.dashboard.getTasks();
                const localAgents = window.dashboard.getAgents();
                
                // IDs locaux existants
                const localTaskIds = new Set(localTasks.map(t => t.id?.toString()));
                const localAgentIds = new Set(localAgents.map(a => a.id?.toString()));
                
                // Filtrer les nouvelles données
                const newTasks = result.tasks.filter(task => 
                    task.ID && !localTaskIds.has(task.ID.toString())
                );
                
                const newAgents = result.agents.filter(agent => 
                    agent.ID && !localAgentIds.has(agent.ID.toString())
                );
                
                if (newTasks.length === 0 && newAgents.length === 0) {
                    this.showNotification('Aucune nouvelle donnée à charger', 'info');
                    return true;
                }
                
                // Convertir le format
                const convertedTasks = newTasks.map(task => ({
                    id: task.ID,
                    name: task['Nom Tâche'] || task.Nom || 'Sans nom',
                    category: task.Catégorie || 'Non catégorisé',
                    agent: task.Agent || 'Non assigné',
                    startTime: task['Date Début'] || new Date().toISOString(),
                    endTime: task['Date Fin'] || '',
                    duration: task.Durée || '00:00:00',
                    status: task.Statut || 'inconnu',
                    description: task.Description || ''
                }));
                
                const convertedAgents = newAgents.map(agent => ({
                    id: agent.ID,
                    name: agent.Nom || 'Sans nom',
                    email: agent.Email || '',
                    department: agent.Département || '',
                    date: agent['Date Ajout'] || new Date().toISOString()
                }));
                
                // Fusionner avec données locales
                const mergedTasks = [...localTasks, ...convertedTasks];
                const mergedAgents = [...localAgents, ...convertedAgents];
                
                // Sauvegarder
                localStorage.setItem('qwanteos_tasks', JSON.stringify(mergedTasks));
                localStorage.setItem('qwanteos_agents', JSON.stringify(mergedAgents));
                
                // Rafraîchir le dashboard
                window.dashboard.updateStatistics();
                window.dashboard.updateCharts();
                window.dashboard.loadAgentsToSelect();
                window.dashboard.updateTodayTasks();
                
                this.showNotification(
                    `Chargé: ${newTasks.length} nouvelles tâches, ${newAgents.length} nouveaux agents`,
                    'success'
                );
                
                return true;
                
            } else {
                this.showNotification('Erreur lors du chargement', 'error');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            this.showNotification('Impossible de charger depuis Google Sheets', 'error');
            return false;
        }
    }

    updateStatus(type, message) {
        // Mettre à jour l'interface
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            const icon = type === 'success' ? '✅' : '❌';
            statusElement.innerHTML = `<span style="color: ${type === 'success' ? '#27ae60' : '#e74c3c'}">
                ${icon} ${message}
            </span>`;
        }
        
        // Mettre à jour le timestamp
        const timeElement = document.getElementById('lastSyncTime');
        if (timeElement && type === 'success') {
            timeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    updateUI() {
        // Mettre à jour le mode
        const modeElement = document.getElementById('syncMode');
        if (modeElement) {
            modeElement.textContent = this.isEnabled ? 'Activé' : 'Désactivé';
            modeElement.style.color = this.isEnabled ? '#27ae60' : '#e74c3c';
        }
        
        // Mettre à jour l'ID dashboard
        const idElement = document.getElementById('dashboardId');
        if (idElement) {
            idElement.textContent = this.dashboardId;
        }
        
        // Mettre à jour le dernier sync
        const lastSync = localStorage.getItem('qwanteos_last_sync');
        if (lastSync) {
            const timeElement = document.getElementById('lastSyncTime');
            if (timeElement) {
                timeElement.textContent = new Date(lastSync).toLocaleTimeString();
            }
        }
    }

    showNotification(message, type) {
        // Utiliser la notification du dashboard si disponible
        if (window.dashboard && window.dashboard.showNotification) {
            window.dashboard.showNotification(message, type);
        } else {
            // Fallback simple
            alert(`${type === 'success' ? '✅' : '❌'} ${message}`);
        }
    }
}

// Initialiser une seule instance
window.googleSync = new GoogleSheetsSync();

// ============ FONCTIONS GLOBALES POUR LES BOUTONS ============
function enableCloudSync() {
    if (window.googleSync) {
        window.googleSync.enable();
    }
}

function disableCloudSync() {
    if (window.googleSync) {
        window.googleSync.disable();
    }
}

function syncNow() {
    if (window.googleSync) {
        window.googleSync.syncNow();
    }
}

function loadFromSheets() {
    if (window.googleSync) {
        window.googleSync.loadFromSheets();
    }
}

function showSyncInfo() {
    if (window.googleSync) {
        const info = `
        Dashboard ID: ${window.googleSync.dashboardId}
        Statut: ${window.googleSync.isEnabled ? 'Activé' : 'Désactivé'}
        URL: ${window.googleSync.scriptUrl}
        `;
        alert(info);
    }
}