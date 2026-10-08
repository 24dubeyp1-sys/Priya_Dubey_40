const API = "/api";
const titles = {
  dashboard: "Dashboard",
  gallery: "Hotel Gallery & Amenities",
  rooms: "Room Management",
  search: "Search Available Rooms",
  book: "Book a Room",
  bookings: "Booking Management"
};

const roomImages = {
  Single: "images/room-single.jpg",
  Double: "images/room-double.jpg",
  Deluxe: "images/room-deluxe.jpg",
  Suite: "images/room-suite.jpg"
};

function getRoomImage(type) {
  return roomImages[type] || "images/room-deluxe.jpg";
}

let roomsCache = [];
let selectedSearchRoomId = null;

// Wallpaper & Ambiance Engine
const wallpapers = {
  pool: { name: "Infinity Pool", image: "images/pool.jpg" },
  exterior: { name: "Grand Facade", image: "images/exterior.jpg" },
  lounge: { name: "Skyline Lounge", image: "images/lounge.jpg" },
  cafe: { name: "Grand Bistro", image: "images/cafe.jpg" },
  spa: { name: "Serenity Spa", image: "images/spa.jpg" },
  suite: { name: "Presidential Suite", image: "images/room-suite.jpg" },
  midnight: { name: "Midnight Royal", image: null, gradient: "linear-gradient(135deg, #0a192f 0%, #172a45 50%, #020c1b 100%)" },
  classic: { name: "Classic Warm", image: null, color: "#f4f1ea" }
};

function initWallpaper() {
  const saved = localStorage.getItem("grandstay_wallpaper") || "pool";
  applyWallpaper(saved);

  const toggleBtn = document.getElementById("wallpaper-toggle-btn");
  const dropdown = document.getElementById("wallpaper-dropdown");
  if (!toggleBtn || !dropdown) return;

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  document.querySelectorAll(".wp-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wpKey = btn.dataset.wp;
      applyWallpaper(wpKey);
      dropdown.classList.add("hidden");
      showToast(`Atmosphere changed to ${wallpapers[wpKey] ? wallpapers[wpKey].name : "Custom"}`);
    });
  });
}

function applyWallpaper(key) {
  const wp = wallpapers[key] || wallpapers.pool;
  const backdrop = document.getElementById("wallpaper-backdrop");
  const overlay = document.getElementById("wallpaper-overlay");
  if (!backdrop) return;

  if (key === "classic") {
    backdrop.style.backgroundImage = "none";
    backdrop.style.backgroundColor = wp.color;
    if (overlay) overlay.style.display = "none";
  } else if (key === "midnight") {
    backdrop.style.backgroundImage = wp.gradient;
    backdrop.style.backgroundColor = "transparent";
    if (overlay) overlay.style.display = "block";
  } else {
    backdrop.style.backgroundImage = `url("${wp.image}")`;
    backdrop.style.backgroundColor = "transparent";
    if (overlay) overlay.style.display = "block";
  }

  document.querySelectorAll(".wp-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.wp === key);
  });

  const labelEl = document.querySelector(".wp-label");
  if (labelEl) {
    labelEl.textContent = `${wp.name}`;
  }

  localStorage.setItem("grandstay_wallpaper", key);
}

// Live Digital Clock & Reception Status
function initLiveClock() {
  function update() {
    const clockEl = document.getElementById("live-clock");
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  update();
  setInterval(update, 1000);
}

// Guest Avatar Palette
const avatarColors = [
  "linear-gradient(135deg, #2563eb, #1d4ed8)",
  "linear-gradient(135deg, #10b981, #047857)",
  "linear-gradient(135deg, #d97706, #b45309)",
  "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "linear-gradient(135deg, #ec4899, #be185d)",
  "linear-gradient(135deg, #0284c7, #0369a1)",
  "linear-gradient(135deg, #475569, #1e293b)"
];

function getGuestAvatar(name) {
  const cleanName = (name || "G").trim();
  const initial = cleanName.charAt(0).toUpperCase();
  const charCodeSum = cleanName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = avatarColors[charCodeSum % avatarColors.length];
  return `<span class="guest-avatar" style="background: ${bg}">${initial}</span>`;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add("hidden"), 2800);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Request failed");
  }
  return body;
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function switchSection(section) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(section).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });
  document.getElementById("page-title").textContent = titles[section];
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchSection(btn.dataset.section));
});

async function loadDashboard() {
  const result = await request(`${API}/dashboard/stats`);
  const stats = result.data;
  document.getElementById("stat-total-rooms").textContent = stats.totalRooms;
  document.getElementById("stat-available-rooms").textContent = stats.availableRooms;
  document.getElementById("stat-booked-rooms").textContent = stats.bookedRooms;
  document.getElementById("stat-total-bookings").textContent = stats.totalBookings;
  document.getElementById("stat-cancelled-bookings").textContent = stats.cancelledBookings;

  // Live Occupancy Progress Bar
  const total = Number(stats.totalRooms || 0);
  const booked = Number(stats.bookedRooms || 0);
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0;
  
  const countEl = document.getElementById("occupancy-rooms-count");
  const barEl = document.getElementById("stat-occupancy-bar");
  const rateEl = document.getElementById("stat-occupancy-rate");
  if (countEl) countEl.textContent = `${booked} of ${total} rooms occupied (${stats.availableRooms} currently available)`;
  if (barEl) barEl.style.width = `${pct}%`;
  if (rateEl) rateEl.textContent = `${pct}%`;
}

async function loadRooms() {
  const q = document.getElementById("room-search").value.trim();
  const type = document.getElementById("room-type-filter").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);

  const result = await request(`${API}/rooms?${params.toString()}`);
  roomsCache = result.data;
  renderRooms(roomsCache);
  fillRoomSelect(roomsCache);
}

function renderRooms(rooms) {
  const tbody = document.getElementById("rooms-table");
  tbody.innerHTML = rooms.map((room) => `
    <tr>
      <td>
        <img src="${getRoomImage(room.room_type)}" alt="${room.room_type}" class="room-thumbnail" />
      </td>
      <td><strong>${room.room_number}</strong></td>
      <td>${room.room_type}</td>
      <td>${formatINR(room.price)}</td>
      <td><span class="status-pill status-${room.status}">${room.status}</span></td>
      <td class="actions">
        <button class="btn small" data-edit="${room.id}">Update</button>
        <button class="btn small danger" data-delete="${room.id}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">No rooms found</td></tr>`;
}

function fillRoomSelect(rooms) {
  const select = document.getElementById("booking-room");
  const current = selectedSearchRoomId || select.value;
  select.innerHTML = rooms.map((room) =>
    `<option value="${room.id}">${room.room_number} - ${room.room_type} (${formatINR(room.price)})</option>`
  ).join("");
  if (current) select.value = current;
  updateBookingSummary();
}

function openRoomModal(room = null) {
  document.getElementById("room-modal").classList.remove("hidden");
  document.getElementById("room-modal-title").textContent = room ? "Update Room" : "Add Room";
  document.getElementById("room-id").value = room ? room.id : "";
  document.getElementById("room-number").value = room ? room.room_number : "";
  document.getElementById("room-type").value = room ? room.room_type : "Single";
  document.getElementById("room-price").value = room ? room.price : "";
  document.getElementById("room-status").value = room ? room.status : "Available";
}

function closeRoomModal() {
  document.getElementById("room-modal").classList.add("hidden");
}

document.getElementById("btn-add-room").addEventListener("click", () => openRoomModal());
document.getElementById("room-cancel").addEventListener("click", closeRoomModal);

document.getElementById("room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("room-id").value;
  const payload = {
    room_number: document.getElementById("room-number").value.trim(),
    room_type: document.getElementById("room-type").value,
    price: Number(document.getElementById("room-price").value),
    status: document.getElementById("room-status").value
  };

  try {
    if (id) {
      await request(`${API}/rooms/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Room updated successfully");
    } else {
      await request(`${API}/rooms`, { method: "POST", body: JSON.stringify(payload) });
      showToast("Room added successfully");
    }
    closeRoomModal();
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.getElementById("rooms-table").addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const room = roomsCache.find((item) => String(item.id) === String(editId));
    if (room) openRoomModal(room);
  }

  if (deleteId) {
    if (!confirm("Delete this room? This is allowed only if there is no active booking.")) return;
    try {
      await request(`${API}/rooms/${deleteId}`, { method: "DELETE" });
      showToast("Room deleted successfully");
      await refreshAll();
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

document.getElementById("room-search").addEventListener("input", () => {
  loadRooms().catch((error) => showToast(error.message, "error"));
});
document.getElementById("room-type-filter").addEventListener("change", () => {
  loadRooms().catch((error) => showToast(error.message, "error"));
});

document.getElementById("search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const type = document.getElementById("search-type").value;
  const checkIn = document.getElementById("search-checkin").value;
  const checkOut = document.getElementById("search-checkout").value;

  try {
    const params = new URLSearchParams({ type, checkIn, checkOut });
    const result = await request(`${API}/rooms/search?${params.toString()}`);
    const container = document.getElementById("search-results");

    if (!result.data.length) {
      container.innerHTML = "<p>No available rooms for the selected dates.</p>";
      return;
    }

    container.innerHTML = result.data.map((room) => `
      <article class="room-card search-room-card">
        <div class="search-room-img-wrap">
          <img src="${getRoomImage(room.room_type)}" alt="${room.room_type}" />
          <span class="room-type-badge">${room.room_type}</span>
        </div>
        <div class="search-room-body">
          <div class="search-room-title-row">
            <h4>Room ${room.room_number}</h4>
            <span class="search-room-price"><strong>${formatINR(room.price)}</strong> / night</span>
          </div>
          <div class="search-room-calc">
            <span>📅 <strong>${room.number_of_nights}</strong> night(s)</span>
            <span>Total: <strong class="total-highlight">${formatINR(room.total_amount)}</strong></span>
          </div>
          <button class="btn primary full-width" data-book-room="${room.id}" data-checkin="${checkIn}" data-checkout="${checkOut}">
            Book Room ${room.room_number}
          </button>
        </div>
      </article>
    `).join("");
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.getElementById("search-results").addEventListener("click", (event) => {
  const roomId = event.target.dataset.bookRoom;
  if (!roomId) return;
  selectedSearchRoomId = roomId;
  document.getElementById("booking-room").value = roomId;
  document.getElementById("booking-checkin").value = event.target.dataset.checkin;
  document.getElementById("booking-checkout").value = event.target.dataset.checkout;
  updateBookingSummary();
  switchSection("book");
});

function updateBookingSummary() {
  const roomId = document.getElementById("booking-room").value;
  const checkIn = document.getElementById("booking-checkin").value;
  const checkOut = document.getElementById("booking-checkout").value;
  const room = roomsCache.find((item) => String(item.id) === String(roomId));
  const nights = nightsBetween(checkIn, checkOut);
  const summary = document.getElementById("booking-summary");

  if (!room || nights <= 0) {
    summary.textContent = "Select a room and valid dates to see nights and total amount.";
    return;
  }

  const total = nights * room.price;
  summary.textContent = `${nights} night(s) × ${formatINR(room.price)} = ${formatINR(total)}`;
}

["booking-room", "booking-checkin", "booking-checkout"].forEach((id) => {
  document.getElementById(id).addEventListener("change", updateBookingSummary);
});

document.getElementById("booking-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    guest_name: document.getElementById("guest-name").value.trim(),
    guest_email: document.getElementById("guest-email").value.trim(),
    guest_phone: document.getElementById("guest-phone").value.trim(),
    room_id: Number(document.getElementById("booking-room").value),
    check_in: document.getElementById("booking-checkin").value,
    check_out: document.getElementById("booking-checkout").value
  };

  const nights = nightsBetween(payload.check_in, payload.check_out);
  if (nights <= 0) {
    showToast("Check-out date must be after check-in date", "error");
    return;
  }

  const room = roomsCache.find((item) => item.id === payload.room_id);
  const total = room ? nights * room.price : 0;
  if (!confirm(`Confirm booking for ${nights} night(s)? Total amount: ${formatINR(total)}`)) {
    return;
  }

  try {
    await request(`${API}/bookings`, { method: "POST", body: JSON.stringify(payload) });
    showToast("Room booked successfully");
    document.getElementById("booking-form").reset();
    selectedSearchRoomId = null;
    await refreshAll();
    switchSection("bookings");
  } catch (error) {
    showToast(error.message, "error");
  }
});

let allBookingsCache = [];
let currentBookingStatus = "ALL";

async function loadBookings() {
  const result = await request(`${API}/bookings`);
  allBookingsCache = result.data || [];
  applyBookingFilters();
}

function updateBookingsKPIs(list) {
  const total = list.length;
  const confirmed = list.filter((b) => b.status === "Confirmed").length;
  const completed = list.filter((b) => b.status === "Completed").length;
  const cancelled = list.filter((b) => b.status === "Cancelled").length;
  const revenue = list
    .filter((b) => b.status !== "Cancelled")
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const kpiTotal = document.getElementById("kpi-total-bookings");
  const kpiConfirmed = document.getElementById("kpi-confirmed-bookings");
  const kpiCompleted = document.getElementById("kpi-completed-bookings");
  const kpiRevenue = document.getElementById("kpi-total-revenue");
  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiConfirmed) kpiConfirmed.textContent = confirmed;
  if (kpiCompleted) kpiCompleted.textContent = completed;
  if (kpiRevenue) kpiRevenue.textContent = formatINR(revenue);

  const cntAll = document.getElementById("count-all");
  const cntConfirmed = document.getElementById("count-confirmed");
  const cntCompleted = document.getElementById("count-completed");
  const cntCancelled = document.getElementById("count-cancelled");
  if (cntAll) cntAll.textContent = total;
  if (cntConfirmed) cntConfirmed.textContent = confirmed;
  if (cntCompleted) cntCompleted.textContent = completed;
  if (cntCancelled) cntCancelled.textContent = cancelled;
}

function applyBookingFilters() {
  updateBookingsKPIs(allBookingsCache);

  const searchInput = document.getElementById("booking-search");
  const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const clearBtn = document.getElementById("booking-search-clear");
  if (clearBtn) {
    clearBtn.classList.toggle("hidden", !q);
  }

  let filtered = allBookingsCache;
  if (currentBookingStatus !== "ALL") {
    filtered = filtered.filter((b) => b.status === currentBookingStatus);
  }

  if (q) {
    filtered = filtered.filter((b) =>
      String(b.id).includes(q) ||
      (b.guest_name && b.guest_name.toLowerCase().includes(q)) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(q)) ||
      (b.guest_phone && b.guest_phone.includes(q)) ||
      String(b.room_number).includes(q) ||
      (b.room_type && b.room_type.toLowerCase().includes(q))
    );
  }

  renderBookings(filtered);
}

function renderBookings(bookings) {
  const tbody = document.getElementById("bookings-table");
  if (!tbody) return;

  if (!bookings.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 36px 16px; color: var(--muted);">
          <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
          <strong style="font-size: 15px; color: var(--navy);">No bookings found</strong>
          <p style="font-size: 13px; margin-top: 4px;">Try selecting another status tab or clear the search filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map((booking) => {
    const nights = booking.number_of_nights || nightsBetween(booking.check_in, booking.check_out);
    return `
      <tr>
        <td><span class="booking-id-tag">#${String(booking.id).padStart(3, "0")}</span></td>
        <td>
          <div class="guest-cell">
            ${getGuestAvatar(booking.guest_name)}
            <div>
              <div class="guest-name">${booking.guest_name}</div>
            </div>
          </div>
        </td>
        <td><span style="color: var(--muted); font-size: 13px;">${booking.guest_email}</span></td>
        <td><span style="color: var(--muted); font-size: 13px;">${booking.guest_phone}</span></td>
        <td><span class="room-badge">Room ${booking.room_number}</span></td>
        <td><span style="font-weight: 600; color: var(--navy); font-size: 13px;">${booking.room_type}</span></td>
        <td>
          <div class="date-range-badge">
            <span>📅 ${booking.check_in}</span>
            <span class="date-arrow">➔</span>
            <span>${booking.check_out}</span>
            <span class="nights-count-tag">${nights}n</span>
          </div>
        </td>
        <td>
          <span class="status-pill status-${booking.status}">
            <span class="status-dot"></span>
            ${booking.status}
          </span>
        </td>
        <td class="actions">
          <button class="btn small" data-view="${booking.id}">View</button>
          ${booking.status === "Confirmed"
            ? `<button class="btn small danger" data-cancel="${booking.id}">Cancel</button>`
            : ""}
        </td>
      </tr>
    `;
  }).join("");
}

function exportBookingsToCSV() {
  if (!allBookingsCache.length) {
    showToast("No bookings to export", "error");
    return;
  }
  const headers = ["Booking ID", "Guest Name", "Guest Email", "Guest Phone", "Room Number", "Room Type", "Check-in", "Check-out", "Nights", "Total (INR)", "Status"];
  const rows = allBookingsCache.map((b) => [
    b.id,
    `"${(b.guest_name || "").replace(/"/g, '""')}"`,
    `"${(b.guest_email || "").replace(/"/g, '""')}"`,
    `"${(b.guest_phone || "").replace(/"/g, '""')}"`,
    b.room_number,
    b.room_type,
    b.check_in,
    b.check_out,
    b.number_of_nights || nightsBetween(b.check_in, b.check_out),
    b.total_amount,
    b.status
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `grandstay_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Bookings exported to CSV successfully!");
}

// Booking Search Input & Clear
const bookingSearchInput = document.getElementById("booking-search");
if (bookingSearchInput) {
  bookingSearchInput.addEventListener("input", applyBookingFilters);
}

const bookingSearchClear = document.getElementById("booking-search-clear");
if (bookingSearchClear) {
  bookingSearchClear.addEventListener("click", () => {
    if (bookingSearchInput) {
      bookingSearchInput.value = "";
      applyBookingFilters();
      bookingSearchInput.focus();
    }
  });
}

// Status Filter Tabs
document.querySelectorAll(".status-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".status-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentBookingStatus = tab.dataset.status;
    applyBookingFilters();
  });
});

// Quick Action Buttons
const btnQuickNewBooking = document.getElementById("btn-quick-new-booking");
if (btnQuickNewBooking) {
  btnQuickNewBooking.addEventListener("click", () => switchSection("book"));
}

const btnExportCsv = document.getElementById("btn-export-csv");
if (btnExportCsv) {
  btnExportCsv.addEventListener("click", exportBookingsToCSV);
}

const btnPrintBookings = document.getElementById("btn-print-bookings");
if (btnPrintBookings) {
  btnPrintBookings.addEventListener("click", () => window.print());
}

document.getElementById("bookings-table").addEventListener("click", async (event) => {
  const viewId = event.target.dataset.view;
  const cancelId = event.target.dataset.cancel;

  if (viewId) {
    try {
      const result = await request(`${API}/bookings/${viewId}`);
      const booking = result.data;
      document.getElementById("view-booking-body").innerHTML = `
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(3, "0")}</p>
        <p><strong>Guest:</strong> ${booking.guest_name}</p>
        <p><strong>Email:</strong> ${booking.guest_email}</p>
        <p><strong>Phone:</strong> ${booking.guest_phone}</p>
        <p><strong>Room:</strong> ${booking.room_number} (${booking.room_type})</p>
        <p><strong>Dates:</strong> ${booking.check_in} to ${booking.check_out}</p>
        <p><strong>Nights:</strong> ${booking.number_of_nights}</p>
        <p><strong>Total:</strong> ${formatINR(booking.total_amount)}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
      `;
      document.getElementById("view-modal").classList.remove("hidden");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  if (cancelId) {
    if (!confirm("Cancel this booking? The record will be kept in history.")) return;
    try {
      await request(`${API}/bookings/${cancelId}/cancel`, { method: "POST" });
      showToast("Booking cancelled successfully");
      await refreshAll();
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

document.getElementById("view-close").addEventListener("click", () => {
  document.getElementById("view-modal").classList.add("hidden");
});

// Hero & Dashboard Navigation Shortcuts
const heroBtnSearch = document.getElementById("hero-btn-search");
if (heroBtnSearch) heroBtnSearch.addEventListener("click", () => switchSection("search"));

const heroBtnGallery = document.getElementById("hero-btn-gallery");
if (heroBtnGallery) heroBtnGallery.addEventListener("click", () => switchSection("gallery"));

const viewGalleryBtn = document.getElementById("view-gallery-btn");
if (viewGalleryBtn) viewGalleryBtn.addEventListener("click", () => switchSection("gallery"));

const viewRoomsBtn = document.getElementById("view-rooms-btn");
if (viewRoomsBtn) viewRoomsBtn.addEventListener("click", () => switchSection("rooms"));

// Quick Book from Dashboard Room Showcase
document.querySelectorAll("[data-quick-type]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.quickType;
    const searchTypeSelect = document.getElementById("search-type");
    if (searchTypeSelect) searchTypeSelect.value = type;
    switchSection("search");
    showToast(`Showing availability search for ${type} Room`);
  });
});

// Gallery Filter Buttons
document.querySelectorAll(".gallery-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gallery-filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    document.querySelectorAll(".gallery-item").forEach((item) => {
      if (filter === "all" || item.dataset.category === filter) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
});

async function refreshAll() {
  await Promise.all([loadDashboard(), loadRooms(), loadBookings()]);
}

// Initialize Interactive Features
initWallpaper();
initLiveClock();
refreshAll().catch((error) => showToast(error.message, "error"));

