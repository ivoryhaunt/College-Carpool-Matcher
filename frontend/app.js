// Address of your backend server
const API = 'http://localhost:3000';

// Safely turn text into HTML-safe text
function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ---------- Post a ride ----------
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    driver_name: document.getElementById('p_name').value,
    driver_email: document.getElementById('p_email').value,
    origin: document.getElementById('p_origin').value,
    destination: document.getElementById('p_dest').value,
    departure_time: new Date(document.getElementById('p_time').value).toISOString(),
    seats_available: Number(document.getElementById('p_seats').value),
  };
  const res = await fetch(`${API}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  alert(res.ok ? 'Ride posted!' : 'Something went wrong');
  if (res.ok) e.target.reset();
});

// ---------- Search rides ----------
document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const params = new URLSearchParams();
  const o = document.getElementById('s_origin').value;
  const d = document.getElementById('s_dest').value;
  const t = document.getElementById('s_time').value;
  if (o) params.append('origin', o);
  if (d) params.append('destination', d);
  if (t) params.append('time', new Date(t).toISOString());

  const res = await fetch(`${API}/rides?${params}`);
  const rides = await res.json();
  const box = document.getElementById('rides');
  box.innerHTML = rides.length ? '' : '<p>No matching rides found.</p>';

  rides.forEach((r) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <b>${esc(r.origin)} → ${esc(r.destination)}</b><br>
      Driver: ${esc(r.driver_name)}<br>
      Time: ${new Date(r.departure_time).toLocaleString()}<br>
      Seats left: ${r.seats_available}<br>
      <button>Request to join</button>`;
    div.querySelector('button').onclick = () => requestRide(r.id);
    box.appendChild(div);
  });
});

async function requestRide(rideId) {
  const rider_name = prompt('Your name?');
  const rider_email = prompt('Your email?');
  if (!rider_name || !rider_email) return;
  const res = await fetch(`${API}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ride_id: rideId, rider_name, rider_email }),
  });
  alert(res.ok ? 'Request sent!' : 'Something went wrong');
}

// ---------- Driver: view and answer requests ----------
document.getElementById('reqForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadRequests();
});

async function loadRequests() {
  const email = document.getElementById('r_email').value;
  const res = await fetch(`${API}/requests?driver_email=${encodeURIComponent(email)}`);
  const list = await res.json();
  const box = document.getElementById('requests');
  box.innerHTML = list.length ? '' : '<p>No requests yet.</p>';

  list.forEach((r) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <b>${esc(r.rider_name)}</b> (${esc(r.rider_email)})<br>
      Ride: ${esc(r.rides.origin)} → ${esc(r.rides.destination)}<br>
      Status: <b>${esc(r.status)}</b><br>`;
    if (r.status === 'pending') {
      const yes = document.createElement('button');
      yes.textContent = 'Accept';
      yes.onclick = () => answer(r.id, 'accepted');
      const no = document.createElement('button');
      no.textContent = 'Reject';
      no.onclick = () => answer(r.id, 'rejected');
      div.append(yes, no);
    }
    box.appendChild(div);
  });
}

async function answer(id, status) {
  const res = await fetch(`${API}/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) alert((await res.json()).error);
  loadRequests();
}
