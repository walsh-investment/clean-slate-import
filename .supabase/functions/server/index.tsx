import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'
import { migrateWalshFamilyData } from './migrate-data.tsx'

const app = new Hono()

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Health check
app.get('/make-server-84035cd9/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Events endpoints
app.get('/make-server-84035cd9/events', async (c) => {
  try {
    const member = c.req.query('member')
    let events
    
    if (member && member !== 'all') {
      events = await kv.getByPrefix(`events:${member}:`)
    } else {
      events = await kv.getByPrefix('events:')
    }
    
    return c.json({ events: events || [] })
  } catch (error) {
    console.log('Error fetching events:', error)
    return c.json({ error: 'Failed to fetch events' }, 500)
  }
})

app.post('/make-server-84035cd9/events', async (c) => {
  try {
    const event = await c.req.json()
    const eventId = `event_${Date.now()}`
    const key = `events:${event.member || 'all'}:${eventId}`
    
    const eventData = {
      id: eventId,
      ...event,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(key, eventData)
    
    return c.json({ success: true, event: eventData })
  } catch (error) {
    console.log('Error creating event:', error)
    return c.json({ error: 'Failed to create event' }, 500)
  }
})

app.put('/make-server-84035cd9/events/:id', async (c) => {
  try {
    const eventId = c.req.param('id')
    const updates = await c.req.json()
    
    // Find the event by ID across all members
    const allEvents = await kv.getByPrefix('events:')
    const existingEvent = allEvents.find(event => event.id === eventId)
    
    if (!existingEvent) {
      return c.json({ error: 'Event not found' }, 404)
    }
    
    const updatedEvent = {
      ...existingEvent,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    const key = `events:${updatedEvent.member || 'all'}:${eventId}`
    await kv.set(key, updatedEvent)
    
    return c.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.log('Error updating event:', error)
    return c.json({ error: 'Failed to update event' }, 500)
  }
})

app.delete('/make-server-84035cd9/events/:id', async (c) => {
  try {
    const eventId = c.req.param('id')
    
    // Find and delete the event by ID across all members
    const allEvents = await kv.getByPrefix('events:')
    const existingEvent = allEvents.find(event => event.id === eventId)
    
    if (!existingEvent) {
      return c.json({ error: 'Event not found' }, 404)
    }
    
    const key = `events:${existingEvent.member || 'all'}:${eventId}`
    await kv.del(key)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting event:', error)
    return c.json({ error: 'Failed to delete event' }, 500)
  }
})

// Tasks endpoints
app.get('/make-server-84035cd9/tasks', async (c) => {
  try {
    const member = c.req.query('member')
    let tasks
    
    if (member && member !== 'all') {
      tasks = await kv.getByPrefix(`tasks:${member}:`)
    } else {
      tasks = await kv.getByPrefix('tasks:')
    }
    
    return c.json({ tasks: tasks || [] })
  } catch (error) {
    console.log('Error fetching tasks:', error)
    return c.json({ error: 'Failed to fetch tasks' }, 500)
  }
})

app.post('/make-server-84035cd9/tasks', async (c) => {
  try {
    const task = await c.req.json()
    const taskId = `task_${Date.now()}`
    const key = `tasks:${task.assignedTo || 'all'}:${taskId}`
    
    const taskData = {
      id: taskId,
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(key, taskData)
    
    return c.json({ success: true, task: taskData })
  } catch (error) {
    console.log('Error creating task:', error)
    return c.json({ error: 'Failed to create task' }, 500)
  }
})

app.put('/make-server-84035cd9/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id')
    const updates = await c.req.json()
    
    // Find the task by ID across all members
    const allTasks = await kv.getByPrefix('tasks:')
    const existingTask = allTasks.find(task => task.id === taskId)
    
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404)
    }
    
    const updatedTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    const key = `tasks:${updatedTask.assignedTo || 'all'}:${taskId}`
    await kv.set(key, updatedTask)
    
    return c.json({ success: true, task: updatedTask })
  } catch (error) {
    console.log('Error updating task:', error)
    return c.json({ error: 'Failed to update task' }, 500)
  }
})

app.delete('/make-server-84035cd9/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id')
    
    // Find and delete the task by ID across all members
    const allTasks = await kv.getByPrefix('tasks:')
    const existingTask = allTasks.find(task => task.id === taskId)
    
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404)
    }
    
    const key = `tasks:${existingTask.assignedTo || 'all'}:${taskId}`
    await kv.del(key)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting task:', error)
    return c.json({ error: 'Failed to delete task' }, 500)
  }
})

// Ride requests endpoints
app.get('/make-server-84035cd9/rides', async (c) => {
  try {
    const member = c.req.query('member')
    let rides
    
    if (member && member !== 'all') {
      rides = await kv.getByPrefix(`rides:${member}:`)
    } else {
      rides = await kv.getByPrefix('rides:')
    }
    
    return c.json({ rides: rides || [] })
  } catch (error) {
    console.log('Error fetching rides:', error)
    return c.json({ error: 'Failed to fetch rides' }, 500)
  }
})

app.post('/make-server-84035cd9/rides', async (c) => {
  try {
    const ride = await c.req.json()
    const rideId = `ride_${Date.now()}`
    const key = `rides:${ride.requestedBy || 'all'}:${rideId}`
    
    const rideData = {
      id: rideId,
      ...ride,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(key, rideData)
    
    return c.json({ success: true, ride: rideData })
  } catch (error) {
    console.log('Error creating ride request:', error)
    return c.json({ error: 'Failed to create ride request' }, 500)
  }
})

app.put('/make-server-84035cd9/rides/:id', async (c) => {
  try {
    const rideId = c.req.param('id')
    const updates = await c.req.json()
    
    // Find the ride by ID across all members
    const allRides = await kv.getByPrefix('rides:')
    const existingRide = allRides.find(ride => ride.id === rideId)
    
    if (!existingRide) {
      return c.json({ error: 'Ride request not found' }, 404)
    }
    
    const updatedRide = {
      ...existingRide,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    const key = `rides:${updatedRide.requestedBy || 'all'}:${rideId}`
    await kv.set(key, updatedRide)
    
    return c.json({ success: true, ride: updatedRide })
  } catch (error) {
    console.log('Error updating ride request:', error)
    return c.json({ error: 'Failed to update ride request' }, 500)
  }
})

// Messages endpoints
app.get('/make-server-84035cd9/messages', async (c) => {
  try {
    const member = c.req.query('member')
    let messages
    
    if (member && member !== 'all') {
      messages = await kv.getByPrefix(`messages:${member}:`)
    } else {
      messages = await kv.getByPrefix('messages:')
    }
    
    return c.json({ messages: messages || [] })
  } catch (error) {
    console.log('Error fetching messages:', error)
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

app.post('/make-server-84035cd9/messages', async (c) => {
  try {
    const message = await c.req.json()
    const messageId = `message_${Date.now()}`
    const key = `messages:${message.recipient || 'all'}:${messageId}`
    
    const messageData = {
      id: messageId,
      ...message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(key, messageData)
    
    return c.json({ success: true, message: messageData })
  } catch (error) {
    console.log('Error creating message:', error)
    return c.json({ error: 'Failed to create message' }, 500)
  }
})

// Family members endpoint
app.get('/make-server-84035cd9/family', async (c) => {
  try {
    const familyMembers = [
      { 
        id: 'charlie', 
        name: 'Charlie', 
        role: 'Parent',
        color: '#3B82F6'
      },
      { 
        id: 'tyra', 
        name: 'Tyra', 
        role: 'Parent',
        color: '#EF4444'
      },
      { 
        id: 'nama', 
        name: 'Nama', 
        role: 'Grandparent',
        color: '#8B5CF6'
      },
      { 
        id: 'pops', 
        name: 'Pops', 
        role: 'Grandparent',
        color: '#059669'
      },
      { 
        id: 'wyatt', 
        name: 'Wyatt', 
        role: 'Child',
        color: '#F59E0B'
      },
      { 
        id: 'beckett', 
        name: 'Beckett', 
        role: 'Child',
        color: '#10B981'
      },
      { 
        id: 'ellis', 
        name: 'Ellis', 
        role: 'Child',
        color: '#F97316'
      },
      { 
        id: 'adelaide', 
        name: 'Adelaide', 
        role: 'Child',
        color: '#EC4899'
      }
    ]
    
    return c.json({ family: familyMembers })
  } catch (error) {
    console.log('Error fetching family members:', error)
    return c.json({ error: 'Failed to fetch family members' }, 500)
  }
})

// Initialize sample data endpoint - now includes Walsh family data migration
app.post('/make-server-84035cd9/init-data', async (c) => {
  try {
    console.log('Initializing Niles database with Walsh family data...');
    
    // Run the Walsh family data migration
    const migrationResult = await migrateWalshFamilyData();
    
    if (migrationResult.success) {
      return c.json({ 
        success: true, 
        message: 'Niles database initialized with Walsh family data',
        details: migrationResult 
      });
    } else {
      return c.json({ 
        success: false, 
        error: 'Migration failed', 
        details: migrationResult 
      }, 500);
    }
  } catch (error) {
    console.log('Error initializing Niles data:', error);
    return c.json({ error: 'Failed to initialize Niles database' }, 500);
  }
})

Deno.serve(app.fetch)