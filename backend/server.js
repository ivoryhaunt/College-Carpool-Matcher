require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
app.use(cors());
app.use(express.json());

// Test route: open http://localhost:3000 in the browser
app.get('/', (req, res) => res.send('Carpool backend is running!'));

// 1. Post a ride (driver)
app.post('/rides', async (req, res) => {
  const { driver_name, driver_email, origin, destination, departure_time, seats_available } = req.body;
  if (!driver_name || !driver_email || !origin || !destination || !departure_time || !seats_available) {
    return res.status(400).json({ error: 'Please fill all fields' });
  }
  const { data, error } = await supabase
    .from('rides')
    .insert([{ driver_name, driver_email, origin, destination, departure_time, seats_available }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 2. Search rides = the MATCHING logic
// Matches: similar origin, similar destination, seats left, and (optionally) within 1 hour of wanted time
app.get('/rides', async (req, res) => {
  const { origin, destination, time } = req.query;
  let query = supabase.from('rides').select('*').gt('seats_available', 0).order('departure_time');

  if (origin) query = query.ilike('origin', `%${origin}%`);
  if (destination) query = query.ilike('destination', `%${destination}%`);
  if (time) {
    const wanted = new Date(time);
    const before = new Date(wanted.getTime() - 60 * 60 * 1000).toISOString();
    const after = new Date(wanted.getTime() + 60 * 60 * 1000).toISOString();
    query = query.gte('departure_time', before).lte('departure_time', after);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 3. Rider asks to join a ride
app.post('/requests', async (req, res) => {
  const { ride_id, rider_name, rider_email } = req.body;
  if (!ride_id || !rider_name || !rider_email) {
    return res.status(400).json({ error: 'Please fill all fields' });
  }
  const { data, error } = await supabase
    .from('ride_requests')
    .insert([{ ride_id, rider_name, rider_email }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 4. Driver sees requests for their rides
app.get('/requests', async (req, res) => {
  const { driver_email } = req.query;
  if (!driver_email) return res.status(400).json({ error: 'driver_email is required' });

  const { data, error } = await supabase
    .from('ride_requests')
    .select('*, rides!inner(origin, destination, departure_time, driver_email, seats_available)')
    .eq('rides.driver_email', driver_email)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 5. Driver accepts or rejects a request
app.patch('/requests/:id', async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted or rejected' });
  }

  const { data: reqRow, error: e1 } = await supabase
    .from('ride_requests').select('*').eq('id', req.params.id).single();
  if (e1) return res.status(404).json({ error: 'Request not found' });

  if (status === 'accepted') {
    const { data: ride } = await supabase.from('rides').select('seats_available').eq('id', reqRow.ride_id).single();
    if (!ride || ride.seats_available < 1) return res.status(400).json({ error: 'No seats left' });
    await supabase.from('rides').update({ seats_available: ride.seats_available - 1 }).eq('id', reqRow.ride_id);
  }

  const { data, error } = await supabase
    .from('ride_requests').update({ status }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
