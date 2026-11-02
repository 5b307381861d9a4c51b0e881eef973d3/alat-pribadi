const REPO_OWNER = "5b307381861d9a4c51b0e881eef973d3";
const REPO_NAME = "alat-pribadi";
const VERSION_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/version.json`;
const ARCHIVE_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/main.zip`;

const statusNode = document.getElementById("update-status");
const checkButton = document.getElementById("check-update");
const downloadButton = document.getElementById("download-update");
const currentVersion = chrome.runtime.getManifest().version;

function compareVersions(a, b) {
  const aa = String(a).split(".").map(v => Number.parseInt(v, 10) || 0);
  const bb = String(b).split(".").map(v => Number.parseInt(v, 10) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  checkButton.disabled = true;
  downloadButton.hidden = true;
  statusNode.textContent = `Versi terpasang: ${currentVersion} • Memeriksa GitHub...`;
  try {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) throw new Error("version.json tidak ditemukan atau repository masih Private.");
      throw new Error(`GitHub merespons HTTP ${response.status}.`);
    }
    const data = await response.json();
    if (!data.version) throw new Error("Format version.json tidak valid.");
    const comparison = compareVersions(data.version, currentVersion);
    if (comparison > 0) {
      statusNode.textContent = `Update tersedia: ${data.version} (terpasang ${currentVersion}). ${data.notes || "Versi terbaru tersedia."}`;
      downloadButton.hidden = false;
      downloadButton.onclick = () => chrome.tabs.create({ url: data.download_url || ARCHIVE_URL });
    } else if (comparison === 0) {
      statusNode.textContent = `ReHine sudah versi terbaru (${currentVersion}).`;
    } else {
      statusNode.textContent = `Versi GitHub (${data.version}) lebih lama dari versi terpasang (${currentVersion}).`;
    }
  } catch (error) {
    statusNode.textContent = `Pemeriksaan gagal: ${error.message}`;
  } finally {
    checkButton.disabled = false;
  }
}

 document.querySelector('#engine').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('engine/engine.html')});
 document.querySelector('#analyzer').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('analyzer/analyzer.html')});
 document.querySelector('#studio').onclick=()=>chrome.tabs.create({url:'https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=video'});
 document.querySelector('#wa').onclick=()=>chrome.tabs.create({url:'https://web.whatsapp.com'});
checkButton.addEventListener("click", checkForUpdates);
checkForUpdates();
