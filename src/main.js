const API_KEY = "b6b287abb701c88fb238721b22716617";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

// ── Favourites ────────────────────────────────────────────────

function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem("favourites")) || [];
  } catch {
    return [];
  }
}

function saveFavourites(favs) {
  localStorage.setItem("favourites", JSON.stringify(favs));
}

function isFavourite(movieId) {
  return getFavourites().some((m) => m.id === movieId);
}

function addFavourite(movie) {
  const favs = getFavourites();
  if (!favs.find((m) => m.id === movie.id)) {
    favs.push(movie);
    saveFavourites(favs);
  }
}

// ── FR009 — Fetch popular movies ──────────────────────────────

async function loadPopularMovies() {
  const errorMsg = document.getElementById("error-msg");

  try {
    const res = await fetch(
      `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`,
    );
    if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
    const data = await res.json();
    const movies = Array.isArray(data.results) ? data.results.slice(0, 20) : [];
    renderMovieGrid(movies);
  } catch (err) {
    console.error("loadPopularMovies:", err);
    renderMovieGrid([]);
    errorMsg.textContent =
      " Could not load movies. Check your API key or network.";
    errorMsg.classList.remove("hidden");
  }
}

// ── FR011 — Render grid ───────────────────────────────────────

function renderMovieGrid(movies) {
  const grid = document.getElementById("movies-grid");
  grid.innerHTML = "";

  if (!movies || movies.length === 0) {
    const msg = document.createElement("p");
    msg.className = "col-span-full text-center text-gray-500 text-sm py-10";
    msg.textContent = "No movies found.";
    grid.appendChild(msg);
    return;
  }

  movies.forEach((movie) => {
    const card = buildMovieCard(movie);
    grid.appendChild(card);
  });
}

// ── FR011 — Build card (textContent, sem escapeHtml) ─────────

function buildMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  if (movie.poster_path) {
    const img = document.createElement("img");
    img.src = `${IMG_BASE}${movie.poster_path}`;
    img.alt = `${movie.title} poster`;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "poster-placeholder";
    placeholder.textContent = "🎬";
    card.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = "p-3";

  const title = document.createElement("p");
  title.className = "font-medium text-sm leading-snug mb-1 line-clamp-2";
  title.textContent = movie.title;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "flex items-center justify-between mb-1";

  const year = document.createElement("span");
  year.className = "text-gray-500 text-xs";
  year.textContent = movie.release_date
    ? movie.release_date.split("-")[0]
    : "—";
  meta.appendChild(year);

  const rating = document.createElement("span");
  rating.className = "rating-badge";
  rating.textContent = `⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}`;
  meta.appendChild(rating);

  body.appendChild(meta);

  const btn = document.createElement("button");
  const alreadyFav = isFavourite(movie.id);
  btn.className = alreadyFav ? "fav-btn added" : "fav-btn";
  btn.textContent = alreadyFav ? "✓ In Journal" : "+ Favourite";
  btn.dataset.id = movie.id;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isFavourite(movie.id)) return;
    addFavourite(movie);
    document.querySelectorAll(`[data-id="${movie.id}"]`).forEach((el) => {
      el.textContent = "✓ In Journal";
      el.classList.add("added");
    });
  });

  body.appendChild(btn);
  card.appendChild(body);
  return card;
}

// ── Favourites toggle ─────────────────────────────────────────

function toggleFavourite(movie, btn) {
  if (isFavourite(movie.id)) return;
  addFavourite(movie);
  document.querySelectorAll(`[data-id="${movie.id}"]`).forEach((el) => {
    el.textContent = "✓ In Journal";
    el.classList.add("added");
  });
}

// ── FR010 — Search ────────────────────────────────────────────

async function handleSearch(e) {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  const dialog = document.getElementById("search-dialog");
  const resultsContainer = document.getElementById("dialog-results");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogSubtitle = document.getElementById("dialog-subtitle");

  dialogTitle.textContent = `"${query}"`;
  dialogSubtitle.textContent = "Searching…";
  resultsContainer.innerHTML = ``;
  dialog.showModal();

  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`,
    );
    if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

    const data = await res.json();
    const movies = Array.isArray(data.results) ? data.results.slice(0, 8) : [];

    dialogSubtitle.textContent =
      movies.length > 0
        ? `${data.total_results} result${data.total_results !== 1 ? "s" : ""} found`
        : "No results found";

    if (movies.length === 0) {
      resultsContainer.innerHTML =
        '<p class="text-gray-500 text-sm text-center py-4">No movies matched your search.</p>';
      return;
    }

    resultsContainer.innerHTML = movies
      .map((movie) => buildResultCard(movie))
      .join("");

    resultsContainer.querySelectorAll(".result-fav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const movieId = Number(btn.dataset.id);
        const movie = movies.find((m) => m.id === movieId);
        if (movie) toggleFavourite(movie, btn);
      });
    });
  } catch (err) {
    console.error("handleSearch:", err);
    dialogSubtitle.textContent = "Error";
    resultsContainer.innerHTML =
      '<p class="text-red-400 text-sm text-center py-4">⚠️ Search failed. Check your API key or network.</p>';
  }
}

// ── Build result card (dialog) ────────────────────────────────

function buildResultCard(movie) {
  const thumb = movie.poster_path
    ? `<img src="${IMG_BASE}${movie.poster_path}" alt="${movie.title}" />`
    : `<div class="result-thumb-placeholder">🎬</div>`;

  const year = movie.release_date ? movie.release_date.split("-")[0] : "—";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const overview = movie.overview
    ? movie.overview.length > 120
      ? movie.overview.slice(0, 120) + "…"
      : movie.overview
    : "No description available.";
  const favLabel = isFavourite(movie.id) ? "✓ In Journal" : "+ Favourite";
  const favClass = isFavourite(movie.id)
    ? "result-fav-btn added"
    : "result-fav-btn";

  return `
    <div class="result-card">
      ${thumb}
      <div style="flex:1;min-width:0;">
        <p class="font-medium text-sm leading-snug">${movie.title}</p>
        <div class="flex items-center gap-2 mt-1 mb-1">
          <span class="text-gray-500 text-xs">${year}</span>
          <span class="rating-badge">⭐ ${rating}</span>
        </div>
        <p class="text-gray-400 text-xs leading-relaxed">${overview}</p>
        <button class="${favClass}" data-id="${movie.id}">${favLabel}</button>
      </div>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();

  const form = document.getElementById("search-form");
  if (form) form.addEventListener("submit", handleSearch);
});
