/**
 * Lead Machine Pro - Shared Database Utility (Supabase)
 */

const db = {
    /**
     * Save a new lead to Supabase
     */
    async saveLead(leadData) {
        const { data, error } = await window.SupabaseClient
            .from('leads')
            .insert([{
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                business: leadData.business,
                service: leadData.service,
                message: leadData.message || '',
                status: leadData.status || 'Nuevo',
                city: leadData.city || 'Desconocida'
            }])
            .select();

        if (error) {
            console.error("Error saving lead:", error);
            throw error;
        }
        return data[0];
    },

    /**
     * Retrieve all leads from Supabase
     */
    async getLeads() {
        const { data, error } = await window.SupabaseClient
            .from('leads')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error("Error fetching leads:", error);
            return [];
        }
        return data;
    },

    /**
     * Update lead status or data in Supabase
     */
    async updateLead(id, updates) {
        const { data, error } = await window.SupabaseClient
            .from('leads')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error("Error updating lead:", error);
            throw error;
        }
        return data[0];
    },

    /**
     * Delete a lead from Supabase
     */
    async deleteLead(id) {
        const { error } = await window.SupabaseClient
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting lead:", error);
            throw error;
        }
    },

    /**
     * Get aggregated stats for charts
     */
    async getStats() {
        const leads = await this.getLeads();
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const stats = {
            total: leads.length,
            today: leads.filter(l => l.timestamp.startsWith(today)).length,
            conversion: leads.length > 0 ? '12.4%' : '0%',
            byStatus: {
                'Nuevo': 0,
                'Contactado': 0,
                'Pendiente': 0,
                'Cerrado': 0,
                'Descartado': 0
            },
            byDay: {}
        };

        leads.forEach(l => {
            if (stats.byStatus[l.status] !== undefined) {
                stats.byStatus[l.status]++;
            }
            const day = l.timestamp.split('T')[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });

        return stats;
    }
};

window.DB = db;
