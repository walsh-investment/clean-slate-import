export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'var(--danger)';
    case 'medium': return 'var(--warning)';
    case 'low': return 'var(--success)';
    default: return 'var(--slate-500)';
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case 'sports': return 'var(--success)';
    case 'activity': return 'var(--primary)';
    case 'lesson': return 'var(--member-adelaide)';
    case 'medical': return 'var(--danger)';
    case 'work': return 'var(--slate-500)';
    case 'fitness': return 'var(--warning)';
    case 'social': return 'var(--member-beckett)';
    case 'recreation': return 'var(--info)';
    case 'shopping': return 'var(--primary)';
    case 'health': return 'var(--member-adelaide)';
    case 'school': return 'var(--member-beckett)';
    case 'family': return 'var(--warning)';
    case 'maintenance': return 'var(--slate-500)';
    case 'music': return 'var(--member-adelaide)';
    case 'chores': return 'var(--info)';
    default: return 'var(--slate-500)';
  }
};

export const getCategoryColor = getTypeColor;

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'var(--success)';
    case 'pending': return 'var(--warning)';
    case 'completed': return 'var(--success)';
    default: return 'var(--slate-500)';
  }
};