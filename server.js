const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Charge les données depuis db.json
let db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));

// ==================== ENDPOINTS ====================

// 1️⃣ GÉOLOCALISATION - Trouver le secteur par adresse
app.get('/api/geolocation', (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  const result = db.geolocation.find(g => 
    g.address.toLowerCase().includes(address.toLowerCase())
  );

  if (!result) {
    return res.status(404).json({
      sector_id: null,
      confidence: 0,
      error: 'Address not found'
    });
  }

  res.json({
    sector_id: result.sector_id,
    address: result.address,
    latitude: result.latitude,
    longitude: result.longitude,
    confidence: result.confidence
  });
});

// 2️⃣ SECTEURS - Récupérer infos d'un secteur
app.get('/api/sectors/:sector_id', (req, res) => {
  const { sector_id } = req.params;
  
  const sector = db.sectors.find(s => s.id === sector_id);
  
  if (!sector) {
    return res.status(404).json({ error: 'Sector not found' });
  }

  res.json(sector);
});

// 3️⃣ STATUT DE COLLECTE - Vérifier le statut actuel
app.get('/api/collection-status', (req, res) => {
  const { sector_id, bin_color, date } = req.query;
  
  if (!sector_id || !bin_color) {
    return res.status(400).json({ error: 'sector_id and bin_color required' });
  }

  const status = db.collection_status.find(cs =>
    cs.sector_id === sector_id &&
    cs.bin_color === bin_color &&
    (!date || cs.date === date)
  );

  if (!status) {
    return res.status(404).json({
      status: 'scheduled',
      message: 'No data for this date'
    });
  }

  res.json({
    status: status.status,
    completion_percentage: status.completion_percentage,
    estimated_completion_time: status.estimated_completion_time,
    completion_time: status.completion_time,
    notes: status.notes
  });
});

// 4️⃣ CALENDRIER - Récupérer le calendrier de collecte
app.get('/api/schedule/:sector_id', (req, res) => {
  const { sector_id } = req.params;
  
  const sector = db.sectors.find(s => s.id === sector_id);
  
  if (!sector) {
    return res.status(404).json({ error: 'Sector not found' });
  }

  res.json({
    sector_id: sector.id,
    sector_name: sector.name,
    schedule: sector.collection
  });
});

// 5️⃣ CRÉER UNE COMMANDE DE BAC
app.post('/api/bin-orders', (req, res) => {
  const { address, sector_id, bin_color, reason, phone } = req.body;
  
  if (!address || !sector_id || !bin_color || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const order_id = `BO${Date.now()}`;
  const new_order = {
    id: order_id,
    address,
    sector_id,
    bin_color,
    reason,
    phone,
    order_date: new Date().toISOString(),
    estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'confirmed'
  };

  db.bin_orders.push(new_order);
  
  res.status(201).json({
    success: true,
    order_id: order_id,
    estimated_delivery: new_order.estimated_delivery,
    message: '✅ Commande confirmée'
  });
});

// 6️⃣ CRÉER UN TICKET D'ESCALADE
app.post('/api/tickets', (req, res) => {
  const { sector_id, address, issue_type, description, phone } = req.body;
  
  if (!sector_id || !address || !issue_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticket_id = `TK${Date.now()}`;
  const new_ticket = {
    id: ticket_id,
    sector_id,
    address,
    issue_type,
    description,
    phone,
    created_date: new Date().toISOString(),
    status: 'open',
    priority: 'normal'
  };

  db.tickets.push(new_ticket);
  
  res.status(201).json({
    success: true,
    ticket_id: ticket_id,
    message: '✅ Ticket créé, un agent vous contactera'
  });
});

// 7️⃣ SANTÉ DE L'API
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, () => {
  console.log(`🚀 Mock API running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /api/geolocation?address=...`);
  console.log(`   GET  /api/sectors/:sector_id`);
  console.log(`   GET  /api/collection-status?sector_id=...&bin_color=...`);
  console.log(`   GET  /api/schedule/:sector_id`);
  console.log(`   POST /api/bin-orders`);
  console.log(`   POST /api/tickets`);
});