import * as kv from './kv_store.tsx'

// Migration helper to populate Niles database with Walsh family sample data
export async function migrateWalshFamilyData() {
  console.log('Starting Walsh family data migration...');
  
  // Sample events from the Walsh family calendar
  const sampleEvents = [
    {
      id: 'event_1',
      title: 'Soccer Practice - Wyatt',
      date: '2025-08-16',
      time: '09:00',
      duration: 90,
      location: 'Community Sports Complex',
      member: 'wyatt',
      type: 'sports',
      description: 'Weekly soccer practice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'event_2', 
      title: 'Tennis Tournament - Ellis',
      date: '2025-08-16',
      time: '14:00',
      duration: 180,
      location: 'Tennis Center',
      member: 'ellis',
      type: 'sports',
      description: 'Junior tennis tournament',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'event_3',
      title: 'Family Dinner',
      date: '2025-08-16',
      time: '18:30',
      duration: 90,
      location: 'Home',
      member: 'all',
      type: 'family',
      description: 'Weekly family dinner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'event_4',
      title: 'Dance Class - Adelaide',
      date: '2025-08-17',
      time: '16:00',
      duration: 60,
      location: 'Dance Studio',
      member: 'adelaide',
      type: 'activity',
      description: 'Ballet class',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Sample tasks
  const sampleTasks = [
    {
      id: 'task_1',
      title: 'Pack soccer gear',
      description: 'Get cleats, shin guards, and water bottle ready',
      assignedTo: 'wyatt',
      dueDate: '2025-08-16',
      priority: 'medium',
      status: 'pending',
      category: 'sports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task_2',
      title: 'Grocery shopping',
      description: 'Buy ingredients for family dinner',
      assignedTo: 'tyra',
      dueDate: '2025-08-16',
      priority: 'high',
      status: 'pending',
      category: 'household',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task_3',
      title: 'Pick up dry cleaning',
      description: 'Collect uniforms from cleaners',
      assignedTo: 'charlie',
      dueDate: '2025-08-17',
      priority: 'low',
      status: 'pending',
      category: 'errands',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Sample ride requests
  const sampleRides = [
    {
      id: 'ride_1',
      title: 'Ride to Soccer Practice',
      requestedBy: 'wyatt',
      destination: 'Community Sports Complex',
      date: '2025-08-16',
      time: '08:45',
      status: 'pending',
      notes: 'Need to be there 15 minutes early',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ride_2',
      title: 'Tennis Tournament Transportation',
      requestedBy: 'ellis',
      destination: 'Tennis Center',
      date: '2025-08-16',
      time: '13:30',
      status: 'pending',
      notes: 'Tournament starts at 2 PM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Sample messages
  const sampleMessages = [
    {
      id: 'message_1',
      type: 'reminder',
      title: 'Soccer Practice Tomorrow',
      content: 'Don\'t forget soccer practice at 9 AM tomorrow. Pack water bottle and cleats!',
      recipient: 'wyatt',
      sender: 'tyra',
      priority: 'medium',
      status: 'unread',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'message_2',
      type: 'announcement',
      title: 'Family Dinner Menu',
      content: 'Tonight\'s dinner: Grilled chicken, roasted vegetables, and rice. Dinner is at 6:30 PM.',
      recipient: 'all',
      sender: 'tyra',
      priority: 'low',
      status: 'unread',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  try {
    // Migrate events
    for (const event of sampleEvents) {
      const key = `events:${event.member}:${event.id}`;
      await kv.set(key, event);
      console.log(`Migrated event: ${event.title}`);
    }

    // Migrate tasks
    for (const task of sampleTasks) {
      const key = `tasks:${task.assignedTo}:${task.id}`;
      await kv.set(key, task);
      console.log(`Migrated task: ${task.title}`);
    }

    // Migrate rides
    for (const ride of sampleRides) {
      const key = `rides:${ride.requestedBy}:${ride.id}`;
      await kv.set(key, ride);
      console.log(`Migrated ride: ${ride.title}`);
    }

    // Migrate messages
    for (const message of sampleMessages) {
      const key = `messages:${message.recipient}:${message.id}`;
      await kv.set(key, message);
      console.log(`Migrated message: ${message.title}`);
    }

    console.log('Walsh family data migration completed successfully!');
    return { success: true, message: 'Migration completed' };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}